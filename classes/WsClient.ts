const WebSocket = require("isomorphic-ws");
const setRestartTimer = require("../helpers/setRestartTimer");

import {CloudEventContainer, checkCloudEventContainer, WsEventType} from "../interfaces/script_loader.interface"
import {ScriptNetServerObj,ScriptNetClientObj} from "../interfaces/ScriptnetObj.interface"
import {timeout}  from "../shared_files/ping_timeout"

const MAX_PING_INTERVAL = timeout*2;

function setUpWebsocket(  scriptnet_server_obj:ScriptNetServerObj, script_net_client_obj:ScriptNetClientObj, onConnected ){

    const ws_final_url = scriptnet_server_obj.protocol+"://"+scriptnet_server_obj.address+getQueryParams(script_net_client_obj);

    console.log("connecting to "+ws_final_url+" "+(new Date().toString()));

    let ws = new WebSocket( ws_final_url );

    ws.on("open", ()=>{
        console.log("connected "+ws_final_url+" "+(new Date().toString()));
        onConnected(ws);
    });

    ws.on("message", ( msg )=>{
        console.log("WsClient.class log "+(msg));
    })

    ws.on("error", (error)=>{
        console.log(`ws.on("error", )`);
        console.log({script_net_client_obj})
        console.log("error "+JSON.stringify(error));

        ws.close();
    })

    ws.on('close', () => {

        console.log("disconnected "+ws_final_url+" "+(new Date().toString()));

        setTimeout(()=>{ 
            // need to call setUpWebsocket returned function to actually get the new ws 
            getWebSocket = setUpWebsocket( scriptnet_server_obj, script_net_client_obj, onConnected );
        }, 1000)
        console.log("ws closed...clearRestartTimer")
        clearRestartTimer();
    });

    ws.on('ping', async (data)=>{
        console.log("ping: "+data.toString());
        resetRestartTimer();
    })

    const {resetRestartTimer, clearRestartTimer} = setRestartTimer(()=>{ 
        console.warn("Ping not received...closing ws connection");
        ws.close(); 
    }, MAX_PING_INTERVAL)

    let getWebSocket=()=>{
        return ws;
    }

    // return get function so the ws reference can change 
    return function(){
        return getWebSocket();
    }
}

function getQueryParams( script_net_client_obj:ScriptNetClientObj ){

    let param_str = "/";

    for( let k in script_net_client_obj ){
        param_str += param_str==="/" ? "?" : "&";

        param_str += k;
        param_str += "=";
        param_str += script_net_client_obj[k];
    }

    return param_str;
}

export {setUpWebsocket};