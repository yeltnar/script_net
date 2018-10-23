import {ScriptEventEmitter} from "./classes/ScriptEventEmitter.class"

const script_event_emitter = new ScriptEventEmitter({
    protocol:"wss",
    address:"ws-expose.mybluemix.net"
});

script_event_emitter.on( "connection-test-event", ()=>{
    console.log("connection-test-event message received: "+new Date());
});