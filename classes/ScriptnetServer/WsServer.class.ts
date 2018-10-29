import {timeout as MAX_PING_INTERVAL}  from "../../shared_files/ping_timeout";
import {CloudEventContainer, checkCloudEventContainer, WsEventType, AddEventContainer} from "../../interfaces/script_loader.interface"
import {filter} from "./filter"
import {checkRequiredKeys} from "./checkRequiredKeys"

const WebSocket = require('ws');
const url = require('url');

const RESOLVE_EVENT_NAME = "RESOLVE_EVENT";

class WsServer{

    wss; // instance of web socket server
    cloud_event_emitter;

    constructor( server, cloud_event_emitter ){

        this.cloud_event_emitter = cloud_event_emitter;

        this.wsInit( server );
    }

    private wsInit( server  ){

        //const wss = new WebSocket.Server({ server, verifyClient:this.verifyClient });
        const wss = new WebSocket.Server({ server, verifyClient:this.verifyClient });

        this.wss = wss;
    
        wss.on('connection', (ws, request)=>{
            console.log("new connection");

            this.setUpClient(ws, request);

            this.setupKeepAlivePing( ws );
            this.handelConnection(ws, request);
        });
    
        console.log("wsInit done");
    }

    verifyClient=( info, callback )=>{

        console.log("calling verifyClient");

        try{
        
            const queryData = url.parse(info.req.url, true).query
            const {parser_name,device_name,group_name,parser_token} = queryData;
            
            if( parser_name && device_name && group_name && parser_token ){
                // good to go
                console.log("good to go")
                callback(true);
            }else{
                const err_str = "Required field missing";
                console.error(err_str);
                console.error("-----");
                console.error(queryData);
                console.error({parser_name, device_name, group_name, parser_token});
                console.error("-----");
                //throw err_str;
                callback(false, 401, JSON.stringify({parser_name, device_name, group_name, parser_token}))
            }

        }catch(e){
            callback(false, 500, JSON.stringify(e) )
        }

    }

    setUpClient(ws, req){

        const queryData = url.parse(req.url, true).query
        const {parser_name,device_name,group_name,parser_token} = queryData;
        ws.device_meta_data = {parser_name,device_name,group_name,parser_token};

        this.cloud_event_emitter.on(RESOLVE_EVENT_NAME, ( cloud_event_container:CloudEventContainer )=>{
            filter(ws, [], cloud_event_container, RESOLVE_EVENT_NAME)
            .catch((err)=>{
                console.error(err);
            }).then(( data )=>{

                // resolve undefined data if shouldn't send
                if( data!==undefined ){
                    ws.send( JSON.stringify(data) );
                }
                
            });
        });
    }

    private setupKeepAlivePing( ws ){

        ws.isAlive = true;
        ws.on("pong", ()=>{
            ws.isAlive=true
            //console.log("got a pong")
        });

        const interval_id = setInterval(()=>{

            if( ws.isAlive===false ){
                clearInterval(interval_id);
                ws.terminate();
            }else{
                ws.isAlive = false;

                const date = (new Date()).toString();

                if( ws.readyState===1  ){
                    ws.ping( JSON.stringify({date}) );
                }else{
                    console.error("WS IS CLOSED BUT WE ARE TRYING TO PING");
                }
            }

        }, MAX_PING_INTERVAL);

    }

    private handelConnection=(ws, req)=>{
        ws.on("message", ( data:CloudEventContainer )=>{
            data = typeof data==="string" ? JSON.parse(data) : data; // make sure we have an instance of EventContainer

            console.log("got message "+JSON.stringify(data));

            if( data.event.event_type===WsEventType.ADD_EVENT ){

                //checkAddEventContainer(data);// TODO make this work
                
                const add_event_data = <AddEventContainer> data;

                const {cloud_event_string, required_keys_table, script_event_string} = add_event_data.event.data;

                this.cloud_event_emitter.on( cloud_event_string, ( data:CloudEventContainer )=>{
                    filter( ws, required_keys_table, data, script_event_string)
                    .catch((err)=>{
                        console.error(err);
                    }).then(( data )=>{

                        // resolve undefined data if shouldn't send
                        if( data!==undefined ){
                            ws.send( JSON.stringify(data) );
                        }
                        
                    });
                });

                console.log("added new cloud event "+JSON.stringify({script_event_string,cloud_event_string}))
                
            }if( data.event.event_type===WsEventType.ADD_ONCE_EVENT ){

                //checkAddEventContainer(data);// TODO make this work
                
                const add_event_data = <AddEventContainer> data;

                const {cloud_event_string, required_keys_table, script_event_string} = add_event_data.event.data;

                this.cloud_event_emitter.once( cloud_event_string, ( data:CloudEventContainer )=>{
                    filter( ws, required_keys_table, data, script_event_string)
                    .catch((err)=>{
                        console.error(err);
                    }).then(( data )=>{

                        // resolve undefined data if shouldn't send
                        if( data!==undefined ){
                            ws.send( JSON.stringify(data) );
                        }
                        
                    });
                });

                console.log("added new WsEventType.ADD_ONCE_EVENT "+JSON.stringify({script_event_string,cloud_event_string}))
                
            }else if( data.event.event_type===WsEventType.DONE ){
                // go through resolve process 

                console.log("---resolveToCloud")

                this.cloud_event_emitter.emit("RESOLVE_EVENT", data)

                console.log("done event...")

            }else if( data.event.event_type===WsEventType.HTTP ){

                checkCloudEventContainer(data);
                console.log("WsEventType.HTTP "+JSON.stringify(data));
                this.cloud_event_emitter.emit( data.event_name, data );
            }else if( data.event.event_type===WsEventType.PLAIN ){ 

                checkCloudEventContainer(data);
                console.log("WsEventType.PLAIN "+JSON.stringify(data));
                console.log("WsEventType.PLAIN "+data.event);
                this.cloud_event_emitter.emit( data.event_name, data );
            }
        })
    }
}

export {WsServer};