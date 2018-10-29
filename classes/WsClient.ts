const WebSocket = require("isomorphic-ws");
const setRestartTimer = require("../helpers/setRestartTimer");

import {CloudEventContainer, checkCloudEventContainer, WsEventType} from "../interfaces/script_loader.interface"
import {ScriptNetServerObj,ScriptNetClientObj} from "../interfaces/ScriptnetObj.interface"
import {timeout}  from "../shared_files/ping_timeout"

const MAX_PING_INTERVAL = timeout*2;

function setUpWebsocket(  scriptnet_server_obj:ScriptNetServerObj, script_net_client_obj:ScriptNetClientObj ){

    const ws_final_url = scriptnet_server_obj.protocol+"://"+scriptnet_server_obj.address+getQueryParams(script_net_client_obj);

    const ws = new WebSocket( ws_final_url );

    ws.on("open", ()=>{
        console.log("connected "+ws_final_url+" "+(new Date().toString()));

    });

    ws.on("message", ( msg )=>{
        console.log("WsClient.class log "+(msg));
    })

    ws.on("error", (error)=>{
        console.log(`ws.on("error", )`);
        console.log(error);

        // console.warn("NEED TO MAKE SURE THIS DOES NOT SET UP TWO CONNECTIONS TO THE SERVER WITH THE WS.ON CLOSE");

        ws.close();
        // setUpWebsocket( scriptnet_server_obj, script_net_client_obj );
        // clearRestartTimer();
    })

    ws.on('close', () => {

        console.log("disconnected "+ws_final_url+" "+(new Date().toString()));

        setTimeout(()=>{ setUpWebsocket( scriptnet_server_obj, script_net_client_obj );}, 1000)
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

    return ws;
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