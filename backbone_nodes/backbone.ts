import ExpressServer from "./express_server/express_server"
import WsServer from "./websocket_server/websocket_server"
import {PendingEventEmitter, pending_event_emitter} from "./PendingEventEmitter/PendingEventEmitter"

const config = require("config");

const express_server = new ExpressServer( pending_event_emitter );
const ws_server =  new WsServer(pending_event_emitter, express_server.server);

// process.on('unhandledRejection', (reason, promise) => {
//     console.log();
//     console.error(reason)
// });

// TODO remove after this... its for testing 
pending_event_emitter.on( {event:"e.e.e"}, (data)=>{
    console.log("test event received | data: "+JSON.stringify(data))
    //console.log("test event received | data: "+JSON.stringify(data,null,2))
    
    if( data.uuid ){
        pending_event_emitter.emit_done( data.uuid );
        console.log("resolved "+data.uuid);
    }else{
        console.log("data.uuid is "+data.uuid);
    }
    
});

// setTimeout(()=>{
//     const connectionObj = {
//         protocol:"ws",
//         server_url:"127.0.0.1:3000"
//     };
//     const WebSocket = require("isomorphic-ws"); // TODO test this to see if it works
//     console.log("connecting to "+connectionObj.protocol+"://"+connectionObj.server_url);
//     const ws = new WebSocket(connectionObj.protocol+"://"+connectionObj.server_url)

//     ws.on("open", ()=>{

//         ws.send( {event:"e.e.e"} ).then(()=>{
//             console.log("wss test done");
//         });

//     });
// }, 3000)
