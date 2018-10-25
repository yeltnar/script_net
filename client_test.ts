import {ScriptEventEmitter} from "./classes/ScriptEventEmitter.class"
import {CloudEventContainer, WsEventType} from "./interfaces/script_loader.interface"

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


// TODO remove
let event:CloudEventContainer = {
    event_name:"connection-test-event",
    device_meta_data:{
        device_name:"device_name"
    },
    event:{
        event_type:WsEventType.PLAIN,
        uuid:"1234567890",
        data:null
    }
};
setTimeout(()=>{
    script_event_emitter.emitToCloud( event );
},3000)