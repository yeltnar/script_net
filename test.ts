import {PendingEventEmitter} from "./classes/PendingEventEmitter"
import {WsClient} from "./classes/WsClient.class"
import {EventContainer, checkEventContainer} from "./interfaces/script_loader.interface"

class ScriptEventEmitter extends PendingEventEmitter{
    
    ws_client:WsClient;

    constructor( script_net_ws_server_obj:ScriptNetServerObj ){
        super();
        this.bindToWebSocket( {script_net_ws_server_obj} );
    }

    bindToWebSocket( {ws_server, script_net_ws_server_obj}:{ws_server?, script_net_ws_server_obj?} ){

        if( ws_server ){
            this.ws_client = ws_server;
        }else if( script_net_ws_server_obj ){
            this.ws_client = new WsClient( script_net_ws_server_obj );
        }

        this.ws_client.on("open", this.ws_events.open)
        this.ws_client.on("message", this.ws_events.message)
    }

    private ws_events = {
        open:()=>{
            console.log("ws connection open");
        },
        message:( event_container:EventContainer )=>{
            if(typeof event_container==="string"){ event_container=JSON.parse(event_container); } // make sure we have an object and not a string

            checkEventContainer(event_container)
                
            this.emit( event_container.event_name, event_container );

        },
    }
}

export default {ScriptEventEmitter}

// local interfaces 
interface ScriptNetServerObj{
    protocol: "ws" | "wss",
    address:string
}