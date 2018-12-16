import {ScriptEventEmitter, uuid_v4} from "../../classes/ScriptEventEmitter.class"
import {WsEventType, AddExpressEndpointContainer, CloudEventContainer, checkCloudEventContainer, EventContainer, EventStrings, LocalEventEntry} from "../../interfaces/script_loader.interface"
import {ScriptNetClientObj} from "../../interfaces/ScriptnetObj.interface"
import sha512HexHash from "../../helpers/crypto"

const {exec, execFile} = require("child_process")
const config = require("config");
const requestP = require("request-promise-native");
const fs = require("fs");

const file_path = "verifier_ids.json";

function start(){
    try{
        console.log("notify starting")
        do_start()
    }catch(e){
        console.error(e);
        console.error("error starting notify");
    }
}

function do_start(){

    const local_config = config.util.loadFileConfigs(__dirname+"/config");

    const {deviceId, apikey} = local_config;

    console.log(local_config);

    const scriptnet_server_obj = local_config.remote_scriptnet_server_obj
    //const scriptnet_server_obj = local_config.local_scriptnet_server_obj

    const scriptnet_client_obj:ScriptNetClientObj = local_config.scriptnet_client_obj;
    scriptnet_client_obj.connection_id = uuid_v4();

    new ScriptEventEmitter(scriptnet_server_obj,scriptnet_client_obj, doneCallback);

    function doneCallback( script_event_emitter:ScriptEventEmitter ){

        const verifier_added_container:CloudEventContainer  = {
            device_meta_data:{},
            event_name:EventStrings.VERIFIER_CONNECTED,
            event:{
                event_type:WsEventType.VERIFIER_CONNECTED,
                uuid:uuid_v4(),
                data:{}
            }
        };
        script_event_emitter.emitToCloud( verifier_added_container );

        const add_request_verification:LocalEventEntry = {
            cloud_event_string:EventStrings.REQUEST_VERIFICATION,
            required_keys_table:undefined,
            script_event_string:EventStrings.REQUEST_VERIFICATION,
        };
        script_event_emitter.addRegisteredEvent( add_request_verification );

        script_event_emitter.on_smart( EventStrings.REQUEST_VERIFICATION, async( data )=>{

            let result = false;

            let {script_net_connector_token, ws_request_data} = data.event.data;

            script_net_connector_token = sha512HexHash(script_net_connector_token);

            if( script_net_connector_token!==undefined && ws_request_data!==undefined ){

                result = checkToken( script_net_connector_token, ws_request_data )
                return {result};

            }else{
                result = false;
                const err = "need more fields";
                return {result, err};
            }
        });
    }

}

function checkToken( script_net_connector_token:string, ws_request_data:object ):boolean{

    const exists = fs.existsSync(file_path);
    let approved = false;
    let master_obj;
    
    if( exists ){
        master_obj = JSON.parse( fs.readFileSync(file_path).toString() );
    }else{
        master_obj = {};
    }

    let current_obj = master_obj[script_net_connector_token];

    if( current_obj!==undefined ){
        approved = current_obj.approved;
    }else{
        approved = false;
    }

    master_obj[script_net_connector_token] = {
        ws_request_data,
        script_net_connector_token,
        approved
    }

    fs.writeFileSync( file_path, JSON.stringify(master_obj) );

    return approved;
}

export default start;