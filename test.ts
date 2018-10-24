// start of server code
import {ScriptnetServer} from "./classes/ScriptnetServer/ScriptnetServer.class"

const scriptnet_server = new ScriptnetServer();

// start of client code
import {ScriptEventEmitter} from "./classes/ScriptEventEmitter.class"

const script_event_emitter = new ScriptEventEmitter({
    // protocol:"wss",
    // address:"ws-expose.mybluemix.net"
    protocol:"ws",
    address:"127.0.0.1:3000"
});

script_event_emitter.on( "connection-test-event", ()=>{
    console.log("connection-test-event message received: "+new Date());
});