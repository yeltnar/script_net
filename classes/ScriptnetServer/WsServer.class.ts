import {timeout as MAX_PING_INTERVAL}  from "../../shared_files/ping_timeout";
import {CloudEventContainer, checkCloudEventContainer, WsEventType, AddEventContainer, EventStrings, AddExpressEndpointContainer, RemoveExpressRouterContainer, EventContainer, EventEmitterCallback} from "../../interfaces/script_loader.interface"
import {filter} from "./filter"
//import {checkRequiredKeys} from "./checkRequiredKeys"
import { uuid_v4 } from "../ScriptEventEmitter.class";
import sha512HexHash from "../../helpers/crypto"

const WebSocket = require('ws');
const url = require('url');
const config = require("config");//

const {master_token_hash} = config;
const MAX_PENDING_TIME = 30 * 60 * 1000;

if( master_token_hash===undefined ){

    console.log(config);

    console.log("master_token not defined");
    process.exit(-1);
}

class WsServer{

    wss; // instance of web socket server
    cloud_event_emitter;
    express_app;

    verifier_setup = false;

    express_set_up = false;

    constructor( server, cloud_event_emitter, express_app ){

        this.cloud_event_emitter = cloud_event_emitter;
        this.express_app = express_app;

        this.wsInit( server );

        this.on_smart( EventStrings.VERIFIER_CONNECTED, this.verifier_added );
        this.on_smart( EventStrings.VERIFIER_DISCONNECTED, this.verifier_removed ); // TODO make this work
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

    verifyClient=async( info, callback )=>{

        console.log("calling verifyClient");

        try{

            let allow = false;
        
            const queryData = url.parse(info.req.url, true).query
            const {script_name,device_name,group_name,parser_token,connection_id, script_net_connector_token} = queryData;

            if( this.express_set_up===true ){
                
                allow = true;

            }else if( (script_name==="cloud_express_server" || script_name==="express_server") && this.verifier_setup===true ){
                
                allow = true;

            }else if( script_name==="verifier" ){
                
                allow = true;

            }

            if( allow ){

                if( script_name && device_name && group_name && parser_token && connection_id && script_net_connector_token ){

                    const {url} = info.req;

                    if( script_name==="verifier" && this.checkTokenAddedLocal(script_net_connector_token) ){

                        // good to go
                        console.log("verifier good to go")
                        callback(true);

                    }else if( await(this.checkTokenAddedCloud(script_net_connector_token, {...queryData, url})) ){

                        // good to go
                        console.log("good to go")
                        callback(true);

                    }else{

                        if( 1>0 ){
                            return callback(false, 401, JSON.stringify({script_name, device_name, group_name, parser_token, connection_id, script_net_connector_token}));
                        }

                        const approve_event:CloudEventContainer = {
                            device_meta_data:{},
                            event_name:EventStrings.PENDING_RESOLVE_CLOUD,
                            event:{
                                event_type:WsEventType.PLAIN,
                                uuid:uuid_v4(),
                                data:{},
                            }
                        };

                        this.emitToCloudPromise( approve_event ).then(( data )=>{
                            console.log( "got response from approve event" )
                            console.log( data )

                            console.log();
                            console.log("need to save uuid");

                            process.exit();
                        }).catch(()=>{
                            console.error("did not get approval");
                            
                        });
                    }

                }else{
                    const err_str = "Required field missing";
                    console.error(err_str);
                    console.error("-----");
                    console.error(queryData);
                    console.error({script_name, device_name, group_name, parser_token, connection_id, script_net_connector_token});
                    console.error("-----");
                    //throw err_str;
                    callback(false, 401, JSON.stringify({script_name, device_name, group_name, parser_token, connection_id, script_net_connector_token}))
                }

            }else{

                console.log("server not ready! Will try again soon ")
                console.log(queryData);
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

            }else if( data.event.event_type===WsEventType.PLAIN || data.event.event_type===WsEventType.ADD_EXPRESS_ENDPOINT || data.event.event_type===WsEventType.VERIFIER_CONNECTED || data.event.event_type===WsEventType.VERIFIER_DISCONNECTED ){ 

                checkCloudEventContainer(data);
                console.log("WsEventType.PLAIN "+JSON.stringify(data));
                console.log("WsEventType.PLAIN "+data.event_name);
                this.cloud_event_emitter.emit( data.event_name, data );
            }
        })
    }

    private parseCloudMessage=()=>{
        
    }

    pullOutRequestData=( req )=>{
        return req;
    }

    // --------------------- script_net functions --------------------- 
    private checkTokenAddedLocal = ( script_net_connector_token,  ):boolean=>{
        console.error()
        console.error()
        console.error("need to check token")
        console.error()


        let token_good = false;

        token_good = master_token_hash === sha512HexHash( script_net_connector_token );

        console.log("sha512HexHash( script_net_connector_token )")
        console.log(sha512HexHash( script_net_connector_token ))
        console.log("master_token_hash")
        console.log(master_token_hash)
        console.log("token_good")
        console.log(token_good)
        console.log()
        console.log()

        return token_good;
    }

    private checkTokenAddedCloud = (script_net_connector_token:string, ws_request_data:object):Promise<boolean>=>{

        console.log("checkTokenAddedCloud");

        return new Promise((resolve, reject)=>{
            
            const request_verification_obj:CloudEventContainer = {
                device_meta_data:{},
                event_name:EventStrings.REQUEST_VERIFICATION,
                event:{
                    event_type:WsEventType.PLAIN,
                    uuid:uuid_v4(),
                    data:{
                        script_net_connector_token,
                        ws_request_data
                    }
                },
            };

            this.emitToCloudPromise( request_verification_obj ).then(( data )=>{
                
                const {result} = data.event.data;

                resolve(result);

            }).catch(()=>{
                console.error("issue with verification");
                resolve(false);
            });

        })
    }

    private emitToCloudPromise = ( cloud_event_container:CloudEventContainer|AddEventContainer ):Promise<any>=>{

        let promise_is_resolved = false;
    
        return new Promise((resolve, reject)=>{

            console.log( "emitToCloudPromise" )// TODO remove
    
            this.emitToCloud( cloud_event_container );
    
            // need reference to event emitter so we can use it inside a not arrow notation scope 
            const eventEmitter = this.cloud_event_emitter;
    
            this.cloud_event_emitter.on( EventStrings.RESOLVE_EVENT, function once( data:EventContainer ){
    
                if(typeof data==="string"){ data=JSON.parse(data); } // make sure we have an object and not a string
    
                if( cloud_event_container.event.uuid===data.event.uuid ){
    
                    console.log("resolving "+data.event.uuid);
                    resolve( data );
                    promise_is_resolved = true;
                    eventEmitter.removeListener( EventStrings.RESOLVE_EVENT, once );
                }
            });
    
            setTimeout(()=>{
    
                if( !promise_is_resolved ){
                    console.error("TIMEOUT ERR - "+JSON.stringify(cloud_event_container))
                    reject({err:"timeout"});
                }
    
            }, MAX_PENDING_TIME);
    
        });
    }

    private emitToCloud( cloud_event_container:CloudEventContainer|AddEventContainer ){

        //checkCloudEventContainer( cloud_event_container ); // TODO need to check if this is of a good type

        console.log( "emitToCloud" )// TODO remove
        console.log( JSON.stringify(cloud_event_container) )// TODO remove
        //TODO remove ^

        this.cloud_event_emitter.emit( cloud_event_container.event_name, cloud_event_container );

    }
    
    // smart version of on
    private on_smart=( event:EventStrings, f:EventEmitterCallback )=>{

        console.log("add smart "+event)

        this.cloud_event_emitter.on( event, async( data:CloudEventContainer )=>{
            let f_result = await f( data );
            this.resolveToCloud( data.event.uuid, f_result );
        });

    }

    // this is sent into the ws to be emitted on the cloud
    private resolveToCloud=( uuid:string, data )=>{
        //checkCloudEventContainer( cloud_event_container ); // TODO need to check if this is of a good type

        const cloud_event:CloudEventContainer = {
            device_meta_data:null,
            event_name:EventStrings.RESOLVE_EVENT,
            event:{
                event_type:WsEventType.DONE,
                uuid,
                data
            }
        };

        //checkCloudEventContainer( cloud_event_container ); // TODO need to check if this is of a good type

        const data_str = JSON.stringify(cloud_event)

        this.cloud_event_emitter.emit( data_str );
    }

    private verifier_added=async(  )=>{

        this.verifier_setup = true

        return {
            verifier_setup:this.verifier_setup
        };
    }

    private verifier_removed=async(  )=>{

        this.verifier_setup = false

        return {
            verifier_setup:this.verifier_setup
        };
    }
}

export {WsServer};