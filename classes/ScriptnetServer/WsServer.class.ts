import {timeout as MAX_PING_INTERVAL}  from "../../shared_files/ping_timeout";
import {CloudEventContainer, checkCloudEventContainer, WsEventType, AddEventContainer, EventStrings, AddExpressEndpointContainer, RemoveExpressRouterContainer} from "../../interfaces/script_loader.interface"
import {filter} from "./filter"
//import {checkRequiredKeys} from "./checkRequiredKeys"
import { uuid_v4 } from "../ScriptEventEmitter.class";

const WebSocket = require('ws');
const url = require('url');

class WsServer{

    wss; // instance of web socket server
    cloud_event_emitter;
    express_app;

    express_set_up = false;

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

            const connect_msg:CloudEventContainer = {
                device_meta_data:{},
                event_name:EventStrings.GREET,
                event:{
                    event_type: WsEventType.INFO,
                    uuid: uuid_v4(),
                    data: null,
                }
            };

            ws.send( JSON.stringify(connect_msg) );

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
            const {script_name,device_name,group_name,parser_token,connection_id} = queryData;

            if( script_name==="cloud_express_server" || script_name==="express_server" || this.express_set_up===true ){ // allow express to connect without it already being connected 

            
                if( script_name && device_name && group_name && parser_token && connection_id ){
                    // good to go
                    console.log("good to go")
                    callback(true);
                }else{
                    const err_str = "Required field missing";
                    console.error(err_str);
                    console.error("-----");
                    console.error(queryData);
                    console.error({script_name, device_name, group_name, parser_token, connection_id});
                    console.error("-----");
                    //throw err_str;
                    callback(false, 401, JSON.stringify({script_name, device_name, group_name, parser_token, connection_id}))
                }
                

            }else{

                console.log("express is not set up! Will try again soon ")
                //console.log( this.express_app );

                setTimeout(()=>{
                    this.verifyClient( info, callback );
                }, 5000)

            }

        }catch(e){
            callback(false, 500, JSON.stringify(e) )
        }

    }

    setUpClient(ws, req){

        ws.remove_event_arr = ws.remove_event_arr || [];

        this.setUpParallelClient(  );

        const queryData = url.parse(req.url, true).query
        const {script_name,device_name,group_name,parser_token,connection_id} = queryData;
        ws.device_meta_data = {script_name,device_name,group_name,parser_token,connection_id};
        console.log(ws.device_meta_data);

        const event_callback = ( cloud_event_container:CloudEventContainer )=>{
            filter(ws, [], cloud_event_container, EventStrings.RESOLVE_EVENT)
            .catch((err)=>{
                console.error(err);
            }).then(( data )=>{

                // resolve undefined data if shouldn't send
                if( data!==undefined ){

                    // ws.send( JSON.stringify(data) );

                    if( ws.readyState === 1 ){
                        ws.send( JSON.stringify(data) );
                    }else{
                        const {device_meta_data} = ws
                        //ws.close();
                        console.log( `not sending to ws(${JSON.stringify(device_meta_data)})... ready state is ${ws.readyState}` );
                    }
                }
            });
        };

        this.cloud_event_emitter.on(EventStrings.RESOLVE_EVENT, event_callback);

        ws.remove_event_arr.push(()=>{
            this.cloud_event_emitter.removeListener(EventStrings.RESOLVE_EVENT, event_callback);
        });

        ws.on("close", ()=>{

            // remove express routes
            const default_router_name:string = ws.device_meta_data.connection_id + ws.device_meta_data.script_name + ws.device_meta_data.device_name + ws.device_meta_data.group_name;

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

            console.log("closing "+JSON.stringify(ws.device_meta_data));

            if( ws.remove_event_arr ){
                console.log("removing ws callback functions");
                ws.remove_event_arr.forEach((cur)=>{
                    cur();
                });
            }else{
                console.log("ws.remove_event_arr not defined")
            }
        });
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
                    //ws.ping( JSON.stringify({date, ...device_meta_data}) );
                    //ws.ping( JSON.stringify({date, device_meta_data}) );

                    const data_str = JSON.stringify({date, ...device_meta_data});

                    console.log( data_str );
                    //ws.ping( data_str ); // TODO put back
                    ws.ping( "keep alive" );

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
                script_name: ws.device_meta_data.script_name,
                device_name: ws.device_meta_data.device_name,
                group_name: ws.device_meta_data.group_name,
                connection_id: ws.device_meta_data.connection_id,
            };

            if( data.event.event_type===WsEventType.ADD_EVENT ){

                console.log()
                console.log("added to ws.remove_event_arr")
                console.log()

                //checkAddEventContainer(data);// TODO make this work
                
                const add_event_data = <AddEventContainer> data;

                const {cloud_event_string, required_keys_table, script_event_string} = add_event_data.event.data;

                const event_callback = ( data:CloudEventContainer )=>{
                    filter( ws, required_keys_table, data, script_event_string)
                    .catch((err)=>{
                        console.error(err);
                    }).then(( data )=>{

                        // resolve undefined data if shouldn't send
                        if( data!==undefined ){
                            ws.send( JSON.stringify(data) );
                        }
                        
                    });
                }

                this.cloud_event_emitter.on( cloud_event_string, event_callback);

                ws.remove_event_arr = ws.remove_event_arr || [];

                ws.remove_event_arr.push(()=>{
                    this.cloud_event_emitter.removeListener( cloud_event_string, event_callback);
                });

                console.log()
                console.log("added to ws.remove_event_arr")
                console.log()

                console.log("added new cloud event "+JSON.stringify({script_event_string,cloud_event_string}))
                
            }if( data.event.event_type===WsEventType.ADD_ONCE_EVENT ){

                //checkAddEventContainer(data);// TODO make this work
                
                const add_event_data = <AddEventContainer> data;

                const {cloud_event_string, required_keys_table, script_event_string} = add_event_data.event.data;

                const event_callback = ( data:CloudEventContainer )=>{
                    filter( ws, required_keys_table, data, script_event_string)
                    .catch((err)=>{
                        console.error(err);
                    }).then(( data )=>{

                        // resolve undefined data if shouldn't send
                        if( data!==undefined ){
                            ws.send( JSON.stringify(data) );
                        }
                        
                    });
                }

                this.cloud_event_emitter.once( cloud_event_string, event_callback);

                ws.remove_event_arr = ws.remove_event_arr || [];

                ws.remove_event_arr.push(()=>{
                    this.cloud_event_emitter.removeListener( cloud_event_string, event_callback);
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