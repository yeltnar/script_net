import {PendingEventEmitter} from "./PendingEventEmitter"
import {setUpWebsocket} from "./WsClient"
import {EventContainer, checkEventContainer} from "../interfaces/script_loader.interface"

class ScriptEventEmitter extends PendingEventEmitter{

    constructor( script_net_ws_server_obj:ScriptNetServerObj ){
        super();
        const ws_client  = this.bindToWebSocket( {script_net_ws_server_obj} );
    }

    private bindToWebSocket( {ws_client, script_net_ws_server_obj}:{ws_client?, script_net_ws_server_obj?} ){

        if( ws_client ){
            ws_client = ws_client;
        }else if( script_net_ws_server_obj ){
            ws_client = setUpWebsocket( script_net_ws_server_obj );
        }

        ws_client.on("message", this.ws_message)

        return ws_client;
    }

    private ws_message = ( event_container:EventContainer )=>{
        if(typeof event_container==="string"){ event_container=JSON.parse(event_container); } // make sure we have an object and not a string

        checkEventContainer(event_container)
            
        this.emit( event_container.event_name, event_container );

    }
}

export default {ScriptEventEmitter}

new ScriptEventEmitter({
    protocol:"wss",
    address:"ws-expose.mybluemix.net"
});

// local interfaces 
interface ScriptNetServerObj{
    protocol: "ws" | "wss",
    address:string
}