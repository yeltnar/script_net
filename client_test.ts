import {ScriptEventEmitter} from "./classes/ScriptEventEmitter.class"

const script_event_emitter = new ScriptEventEmitter({
    // protocol:"wss",
    // address:"ws-expose.mybluemix.net"
    protocol:"ws",
    address:"127.0.0.1:3000"
},{
    parser_name:"parser_name",
    device_name:"device_name",
    group_name:"group_name",
    parser_token:"parser_token"
});

script_event_emitter.on( "connection-test-event", ()=>{
    console.log("connection-test-event message received: "+new Date());
});