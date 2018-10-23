const WebSocket = require("isomorphic-ws");

import {PendingEventEmitter} from "./PendingEventEmitter"
import {CloudEventContainer, checkCloudEventContainer} from "../interfaces/script_loader.interface"

// local interfaces 
interface ScriptNetServerObj{
    protocol: "ws" | "wss",
    address:string
}

function setUpWebsocket(  scriptnet_server_obj:ScriptNetServerObj ){

    const ws_final_url = scriptnet_server_obj.protocol+"://"+scriptnet_server_obj.address;

    const ws = new WebSocket( ws_final_url );

    ws.on("open", ()=>{
        console.log("ws connection open")
    });

    ws.on("message", ( msg )=>{
        console.log("WsClient.class "+JSON.stringify(msg));
    })

    ws.on("error", (error)=>{
        console.log(`ws.on("error", )`)
        console.log(error)
    })

    const sendObj=( obj:CloudEventContainer )=>{

        checkCloudEventContainer( obj );

        ws.send( JSON.stringify(obj) );
    }

    return ws;
}

export {setUpWebsocket} ;