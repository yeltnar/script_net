import {setUpWebsocket} from "./WsClient"
import {EventContainer, checkEventContainer, CloudEventContainer, checkCloudEventContainer} from "../interfaces/script_loader.interface"
import { EventEmitter } from "events";
import {ScriptNetServerObj,ScriptNetClientObj} from "../interfaces/ScriptnetObj.interface"

const uuid_v4 = require('uuid/v4');

class ScriptEventEmitter {

    constructor( script_net_ws_server_obj:ScriptNetServerObj, script_net_ws_client_obj:ScriptNetClientObj ){

        const eventEmitter = new EventEmitter();

        this.emit = eventEmitter.emit;
        this.on = eventEmitter.on;

        const ws_client  = this.bindToWebSocket( {script_net_ws_server_obj, script_net_ws_client_obj} );

        this._sendToWsServer = ( data_str )=>{
            ws_client.send( data_str );
        }
    }

    // this is sent into the ws to be emitted on the cloud
    public emitToCloud=( cloud_event_container:CloudEventContainer )=>{
        checkCloudEventContainer( cloud_event_container );

        const data_str = JSON.stringify(cloud_event_container)

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
}

export {ScriptEventEmitter, uuid_v4}