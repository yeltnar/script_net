
import { ScriptEventEmitter, uuid_v4, HttpReturn } from "../../classes/ScriptEventEmitter.class"
import { WsEventType, CloudEventContainer, EventStrings } from "../../interfaces/script_loader.interface"
import { ScriptNetClientObj } from "../../interfaces/ScriptnetObj.interface"
import { addExpressEndpoint, bindCloudEventToLocalEvent, addEvent, addHttpEndpoint } from "../../helpers/script_net_link"

import get_script_net_connector_token from "../../helpers/uuid_token_manager";

const config = require("config");
const requestP = require("request-promise-native");

function start() {
    try {
        console.log("notify starting")
        do_start()
    } catch (e) {
        console.error(e);
        console.error("error starting notify");
    }
}

function do_start() {

    const local_config = config.util.loadFileConfigs(__dirname + "/config");

    const { deviceId, apikey } = local_config;

    console.log(local_config);

    const scriptnet_server_obj = local_config.remote_scriptnet_server_obj
    //const scriptnet_server_obj = local_config.local_scriptnet_server_obj

    const scriptnet_client_obj: ScriptNetClientObj = local_config.scriptnet_client_obj;
    scriptnet_client_obj.connection_id = uuid_v4();
    scriptnet_client_obj.script_net_connector_token = get_script_net_connector_token();

    new ScriptEventEmitter(scriptnet_server_obj, scriptnet_client_obj, doneCallback);

    function doneCallback(script_event_emitter: ScriptEventEmitter) {

        console.log("in doneCallback");

        script_event_emitter.getWsClient().on("error", () => {
            console.log('test err')
            process.exit(0);
        });

        addExpressEndpoint( script_event_emitter, "/notify", "notify", "ALL", EventStrings.asfd );

        bindCloudEventToLocalEvent( script_event_emitter, EventStrings.asfd, EventStrings.asfd )

        addHttpEndpoint( script_event_emitter, EventStrings.asdf,  httpCallback);

        bindCloudEventToLocalEvent( script_event_emitter, EventStrings.CLOUD_NOTIFY, EventStrings.LOCAL_NOTIFY )

        // react to express request 
        addEvent( script_event_emitter, EventStrings.LOCAL_NOTIFY, eventCallback );

        console.log("doneCallback finished")
    }

}

export default start;
