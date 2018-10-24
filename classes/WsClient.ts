const WebSocket = require("isomorphic-ws");
const setRestartTimer = require("../helpers/setRestartTimer");

import {CloudEventContainer, checkCloudEventContainer} from "../interfaces/script_loader.interface"

//const MAX_PING_INTERVAL = 1000 * 60 * 5;
const MAX_PING_INTERVAL = 1000 * 5;

// local interfaces 
interface ScriptNetServerObj{
    protocol: "ws" | "wss",
    address:string
}

function setUpWebsocket(  scriptnet_server_obj:ScriptNetServerObj ){

    const ws_final_url = scriptnet_server_obj.protocol+"://"+scriptnet_server_obj.address;

    const ws = new WebSocket( ws_final_url );

    const {resetRestartTimer, clearRestartTimer} = setRestartTimer(()=>{ ws.close(); }, MAX_PING_INTERVAL)

    ws.on("open", ()=>{
        console.log("connected "+ws_final_url+" "+(new Date().toString()));
    });

    ws.on("message", ( msg )=>{
        console.log("WsClient.class "+JSON.stringify(msg));
    })

    ws.on("error", (error)=>{
        console.log(`ws.on("error", )`);
        console.log(error);

        console.warn("NEED TO MAKE SURE THIS DOES NOT SET UP TWO CONNECTIONS TO THE SERVER WITH THE WS.ON CLOSE");

        ws.close();
        setUpWebsocket( scriptnet_server_obj );
        clearRestartTimer();
    })

    ws.on('close', () => {

        console.log("disconnected "+ws_final_url+" "+(new Date().toString()));

        setTimeout(()=>{ setUpWebsocket( scriptnet_server_obj );}, 1000)
        clearRestartTimer();
    });

    ws.on('ping',async (data)=>{
        console.log("ping: "+data.toString());
        resetRestartTimer();
    })

    return ws;
}

export {setUpWebsocket};