import {ScriptEventEmitter, uuid_v4} from "../../classes/ScriptEventEmitter.class"
import {WsEventType, AddExpressEndpointContainer} from "../../interfaces/script_loader.interface"
import {ScriptNetClientObj} from "../../interfaces/ScriptnetObj.interface"

import {startSchedule} from "./startSchedule";

const config = require("config");
const local_config = config.util.loadFileConfigs("./config/client_test")

const scriptnet_server_obj = local_config.remote_scriptnet_server_obj

const scriptnet_client_obj:ScriptNetClientObj = local_config.scriptnet_client_obj;
scriptnet_client_obj.connection_id = uuid_v4();

new ScriptEventEmitter(scriptnet_server_obj,scriptnet_client_obj, doneCallback);

function doneCallback( script_event_emitter:ScriptEventEmitter ){

    console.log( "in doneCallback" );

    script_event_emitter.getWsClient().on("error", ()=>{
        console.log('test err')
        process.exit(0);
    });
    
    startSchedule();
}