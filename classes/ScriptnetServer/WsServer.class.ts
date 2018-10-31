import {timeout as MAX_PING_INTERVAL}  from "../../shared_files/ping_timeout";
import {CloudEventContainer, checkCloudEventContainer, WsEventType, AddEventContainer, EventStrings, AddExpressEndpointContainer, RemoveExpressRouterContainer} from "../../interfaces/script_loader.interface"
import {filter} from "./filter"
import {checkRequiredKeys} from "./checkRequiredKeys"
import { uuid_v4 } from "../ScriptEventEmitter.class";

const WebSocket = require('ws');
const url = require('url');

class WsServer{

    wss; // instance of web socket server
    cloud_event_emitter;
    express_app;

    constructor( server, cloud_event_emitter, express_app ){

        this.cloud_event_emitter = cloud_event_emitter;
        this.express_app = express_app;

        this.wsInit( server );
    }

    private wsInit( server  ){

        //const wss = new WebSocket.Server({ server, verifyClient:this.verifyClient });
        const wss = new WebSocket.Server({ server, verifyClient:this.verifyClient });

        this.wss = wss;
    
        wss.on('connection', (ws, request)=>{
            console.log("new connection ");

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

        this.setUpParallelClient(  );

        const queryData = url.parse(req.url, true).query
        const {parser_name,device_name,group_name,parser_token} = queryData;
        ws.device_meta_data = {parser_name,device_name,group_name,parser_token};
        console.log(ws.device_meta_data);

        this.cloud_event_emitter.on(EventStrings.RESOLVE_EVENT, ( cloud_event_container:CloudEventContainer )=>{
            filter(ws, [], cloud_event_container, EventStrings.RESOLVE_EVENT)
            .catch((err)=>{
                console.error(err);
            }).then(( data )=>{

                // resolve undefined data if shouldn't send
                if( data!==undefined ){
                    if( ws.readyState === 1 ){
                        ws.send( JSON.stringify(data) );
                    }else{
                        const {device_meta_data} = ws
                        console.log( `not sending to ws(${JSON.stringify(device_meta_data)})... ready state is ${ws.readyState}` );
                    }
                }
                
            });
        });

        ws.on("close", ()=>{

            // if( ws.express_endpoint_list ){
            //     ws.express_endpoint_list.forEach((cur, i, arr) => {

            //         this.cloud_event_emitter.emit( EventStrings.REMOVE_EXPRESS_ENDPOINT,  );

            //     });
            // }

            // ws.

            const default_router_name:string = ws.device_meta_data.script_name + ws.device_meta_data.device_name + ws.device_meta_data.group_name;

            const data:RemoveExpressRouterContainer = {
                event:{
                    event_type:WsEventType.REMOVE_EXPRESS_ENDPOINT,
                    uuid:uuid_v4(),
                    data:{
                        router_name:default_router_name
                    }
                },
                event_name:EventStrings.REMOVE_EXPRESS_ENDPOINT,
                device_meta_data:{}
            };

            this.cloud_event_emitter.emit( data.event_name, data );

            console.log("closing "+JSON.stringify(ws.device_meta_data))
            
            //throw "need to remove express endpoints";

        })
    }

    setUpParallelClient(){

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
                const {device_meta_data} = ws;

                if( ws.readyState===1  ){
                    ws.ping( JSON.stringify({date, ...device_meta_data}) );
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

            data.sender_device_meta_data = {
                
                script_name: ws.device_meta_data.parser_name,
                device_name: ws.device_meta_data.device_name,
                group_name: ws.device_meta_data.group_name,
            };

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

            }else if( data.event.event_type===WsEventType.PLAIN || data.event.event_type===WsEventType.ADD_EXPRESS_ENDPOINT ){ 

                checkCloudEventContainer(data);
                console.log("WsEventType.PLAIN "+JSON.stringify(data));
                console.log("WsEventType.PLAIN "+data.event_name);
                this.cloud_event_emitter.emit( data.event_name, data );
            }
        })
    }

    pullOutRequestData=( req )=>{
        return req;
    }
}

export {WsServer};