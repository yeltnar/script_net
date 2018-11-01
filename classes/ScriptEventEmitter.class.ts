import {setUpWebsocket} from "./WsClient"
import {EventContainer, checkEventContainer, CloudEventContainer, checkCloudEventContainer, LocalEventEntry, AddEventContainer, WsEventType, EventStrings} from "../interfaces/script_loader.interface"
import { EventEmitter } from "events";
import {ScriptNetServerObj,ScriptNetClientObj} from "../interfaces/ScriptnetObj.interface"

const uuid_v4 = require('uuid/v4');


const MAX_PENDING_TIME = 20000; // time in ms

interface EventEmitterCallback {
    (data: CloudEventContainer): Promise<object>;
}

class ScriptEventEmitter {

    registered_cloud_events:Array<LocalEventEntry> = [];

    private eventEmitter;

    ws_client;

    constructor( script_net_ws_server_obj:ScriptNetServerObj, script_net_ws_client_obj:ScriptNetClientObj, doneCallback? ){

        const eventEmitter = new EventEmitter();

        this.emit = eventEmitter.emit;
        this.on = eventEmitter.on;

        this.eventEmitter = eventEmitter;

        const ws_client  = this.bindToWebSocket( {script_net_ws_server_obj, script_net_ws_client_obj} );

        this._sendToWsServer = ( data_str )=>{
            if( ws_client.readyState === 1 ){
                ws_client.send( data_str );
            }else{
                ws_client.close();
                console.log("!!!ws is closed!!!")
            }   
            
        }

        this.ws_client = ws_client;

        ws_client.on("open", this.addRegisteredEvents);
        ws_client.on("open", ()=>{
            console.log(" is open ");
        });
        if( doneCallback!==undefined ){
            ws_client.on("open", ()=>{
                console.log("calling doneCallback...");
                doneCallback(this);
            });
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

    private bindToWebSocket( {ws_client, script_net_ws_server_obj, script_net_ws_client_obj}:{ws_client?, script_net_ws_server_obj?, script_net_ws_client_obj} ){

        if( ws_client ){
            ws_client = ws_client;
        }else if( script_net_ws_server_obj ){
            ws_client = setUpWebsocket( script_net_ws_server_obj, script_net_ws_client_obj );
        }

        ws_client.on("message", this.ws_message)

        return ws_client;
    }

    private ws_message = ( event_container:EventContainer )=>{
        if(typeof event_container==="string"){ event_container=JSON.parse(event_container); } // make sure we have an object and not a string

        checkEventContainer(event_container)
            
        this.emit( event_container.event_name, event_container );

    }
    
    // smart version of on
    public on_smart=( event:string, f:EventEmitterCallback )=>{

        this.on( event, async( data:CloudEventContainer )=>{
            let f_result = await f( data );
            this.resolveToCloud( data.event.uuid, f_result );
        });

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
            event_name:"ADD_CLOUD_EVENT",
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

export {ScriptEventEmitter, uuid_v4}