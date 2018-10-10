import {PendingEventEmitter} from "../PendingEventEmitter/PendingEventEmitter"
import {ScriptNetWebsocketClient} from "../ScriptNetWebsocketClient/ScriptNetWebsocketClient"

class WebsocketEventEmitter extends PendingEventEmitter{

    protected script_net_websocket_client:ScriptNetWebsocketClient;

    constructor(){
        super();
        new ScriptNetWebsocketClient( this );
    }

}

import {WsEvent,WsEventType} from "./../../Interfaces/EventInterfaces/WsEvent.interface";
function test(){

    let wee = new WebsocketEventEmitter();

    const d:WsEvent = {
        event_obj:{
            event:"e.e.e"
        },
        type:WsEventType.PLAIN
    };
    wee.emit( d );

    process.on('uncaughtException', (err) => {
        console.error("uncaughtException")
        console.error(err);
    });
}

test(); // TODO make this only run when not required as a child or imported. 