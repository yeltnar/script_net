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

script_event_emitter.on( "connection-test-event", (data:CloudEventContainer)=>{
    // console.log("connection-test-event message received: "+new Date());
    // console.log("connection-test-event message received: "+JSON.stringify(data));
    // console.log("device_meta_data: "+JSON.stringify(data.device_meta_data));
    // console.log("event: "+JSON.stringify(data.event));
    // console.log("event_name: "+(data.event_name));

    let time_ms = (new Date()).getTime();

    script_event_emitter.resolveToCloud( data.event.uuid, {worked:"worked", time_ms} );
});


// TODO remove
let event:CloudEventContainer = {
    event_name:"connection-test-event",
    device_meta_data:{
        //device_name:"device_name"
    },
    event:{
        event_type:WsEventType.PLAIN,
        uuid:"1234567890",
        data:null
    }
};
setTimeout(()=>{

    let start = (new Date()).getTime();

    script_event_emitter.emitToCloudPromise( event ).then((data:CloudEventContainer)=>{

        let end = (new Date()).getTime();

        let middle = data.event.data.time_ms;


        console.log("emit to cloud then")
        console.log(end - start)
        console.log(end - middle)
        console.log(end - (new Date()).getTime())

        process.exit(0);
    });
},3000)