import {setUpWebsocket} from "./WsClient"
import {EventContainer, checkEventContainer, CloudEventContainer, checkCloudEventContainer, LocalEventEntry, AddEventContainer, WsEventType, EventStrings} from "../interfaces/script_loader.interface"
import { EventEmitter } from "events";
import {ScriptNetServerObj,ScriptNetClientObj} from "../interfaces/ScriptnetObj.interface"

const uuid_v4 = require('uuid/v4');


const MAX_PENDING_TIME = 20000; // time in ms

interface EventEmitterCallback {
    (data: CloudEventContainer): Promise<object>;
}

interface HttpReturn {
    status:number, // it is assumed on the server that these are required
    msg:any, // it is assumed on the server that these are required
    type:"application/json"|"text/html"|"text/css"|"application/javascript"|"text/plain", // it is assumed on the server that these are required
    msg_only:boolean // it is assumed on the server that these are required
}
interface EventEmitterCallbackHttp {
    (data: CloudEventContainer): Promise<HttpReturn>;
}

class ScriptEventEmitter {

    registered_cloud_events:Array<LocalEventEntry> = [];

    private eventEmitter;

    getWsClient;

    constructor( script_net_ws_server_obj:ScriptNetServerObj, script_net_ws_client_obj:ScriptNetClientObj, doneCallback? ){

        this.bindToWebSocket( {script_net_ws_server_obj, script_net_ws_client_obj}, doneCallback );

        this._sendToWsServer = ( data_str )=>{
            if( this.getWsClient().readyState === 1 ){
                this.getWsClient().send( data_str );
            }else{
                this.getWsClient().close();
                console.log("!!!ws is closed!!!")
            }   
            
        }
    }

    // this is sent into the ws to be emitted on the cloud
    public emitToCloudPromise = ( cloud_event_container:CloudEventContainer|AddEventContainer ):Promise<any>=>{

        let promise_is_resolved = false;

        return new Promise((resolve, reject)=>{

            this.emitToCloud( cloud_event_container );

            this.on( EventStrings.RESOLVE_EVENT, function once( data:EventContainer ){

                if(typeof data==="string"){ data=JSON.parse(data); } // make sure we have an object and not a string

                if( cloud_event_container.event.uuid===data.event.uuid ){

                    console.log("resolving "+data.event.uuid);
                    resolve( data );
                    promise_is_resolved = true;
                    this.eventEmitter.removeListener( EventStrings.RESOLVE_EVENT, once );
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

    public emitToCloud( cloud_event_container:CloudEventContainer|AddEventContainer ){

        //checkCloudEventContainer( cloud_event_container ); // TODO need to check if this is of a good type

        const data_str = JSON.stringify(cloud_event_container)

        this._sendToWsServer( data_str );

    }

    // this is sent into the ws to be emitted on the cloud
    public resolveToCloud=( uuid:string, data )=>{
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

        this._sendToWsServer( data_str );
    }

    private bindToWebSocket( {script_net_ws_server_obj, script_net_ws_client_obj}:{script_net_ws_server_obj?, script_net_ws_client_obj}, doneCallback ){

        this.getWsClient = setUpWebsocket( script_net_ws_server_obj, script_net_ws_client_obj, (ws)=>{ 
            this.onConnected(doneCallback, ws) 
        });
    }

    private ws_message = ( event_container:EventContainer )=>{
        if(typeof event_container==="string"){ event_container=JSON.parse(event_container); } // make sure we have an object and not a string

        checkEventContainer(event_container)
            
        this.emit( event_container.event_name, event_container );

    }
    
    // smart version of on
    public on_smart=( event:EventStrings, f:EventEmitterCallback )=>{

        console.log("add smart "+event)

        this.on( event, async( data:CloudEventContainer )=>{
            let f_result = await f( data );
            this.resolveToCloud( data.event.uuid, f_result );
        });

    }
    
    // http version of on_smart. it requires some http metadata 
    public on_smart_http=( event:EventStrings, f:EventEmitterCallbackHttp )=>{

        return this.on_smart( event, f );

    }

    private onConnected = ( doneCallback, ws )=>{

        const eventEmitter = new EventEmitter();

        this.emit = eventEmitter.emit;
        this.on = eventEmitter.on;

        this.eventEmitter = eventEmitter;

        console.log( "ws.device_meta_data..." );
        console.log( ws.device_meta_data );
        
        console.log(" is open ");

        this.addRegisteredEvents()

        this.getWsClient().on("message", this.ws_message)

        this.getWsClient().on("open", ()=>{
            
        });

        if( doneCallback!==undefined ){
            console.log("calling doneCallback...");
            doneCallback(this);
        }
    }

    /******* start of stub functions *******/
    // these will be replaced by core functions

    // this is replaced by the event emitter version     
    // function only to be called by ws (or another valid source) 
    private emit=( event: string|symbol, ...args:any[] )=>{}

    // this is replaced by the event emitter version 
    // function to listen to ws events
    public on=( event:string|symbol, listener )=>{}

    // this is replaced by the ws version... no need for code in this function
    private _sendToWsServer=( s:string )=>{}

    addRegisteredEvent=( local_event_entry:LocalEventEntry )=>{

        const to_emit_to_cloud:AddEventContainer = {
            event_name:EventStrings.ADD_CLOUD_EVENT,
            event:{
                event_type:WsEventType.ADD_EVENT,
                uuid:uuid_v4(),
                data:local_event_entry
            }
        };

        this.emitToCloud( to_emit_to_cloud );
    }

    private addRegisteredEvents=()=>{

        this.registered_cloud_events.forEach(( cur_local_event_entry:LocalEventEntry, i, arr )=>{

            this.addRegisteredEvent( cur_local_event_entry );
        });
    }   


}

export {ScriptEventEmitter, uuid_v4, HttpReturn}