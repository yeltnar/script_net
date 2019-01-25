import { ScriptEventEmitter, uuid_v4, HttpReturn } from "../../classes/ScriptEventEmitter.class"
import { WsEventType, CloudEventContainer, EventStrings } from "../../interfaces/script_loader.interface"
import { ScriptNetClientObj } from "../../interfaces/ScriptnetObj.interface"
import { addExpressEndpoint, bindCloudEventToLocalEvent, addEvent, addHttpEvent } from "../../helpers/script_net_link"
import get_script_net_connector_token from "../../helpers/uuid_token_manager";

import {setup_obdEventsCallback} from "./obdEventsCallback"
let obdEventsCallback;

const fs = require("fs");
const config = require("config");
const requestP = require('request-promise-native');

const client_token_location = "./.client_token";

const obd_data = {
    client_id:undefined,
    client_secret:undefined
};

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

    const { client_id, client_secret } = local_config;
    obd_data.client_id = client_id;
    obd_data.client_secret = client_secret;

    console.log(local_config);

    const scriptnet_server_obj = local_config.remote_scriptnet_server_obj
    //const scriptnet_server_obj = local_config.local_scriptnet_server_obj

    const scriptnet_client_obj: ScriptNetClientObj = local_config.scriptnet_client_obj;
    scriptnet_client_obj.connection_id = uuid_v4();
    scriptnet_client_obj.script_net_connector_token = get_script_net_connector_token();

    new ScriptEventEmitter(scriptnet_server_obj, scriptnet_client_obj, doneCallback);

    function doneCallback(script_event_emitter: ScriptEventEmitter) {
        
        obdEventsCallback = setup_obdEventsCallback( script_event_emitter );

        console.log("in doneCallback");

        script_event_emitter.getWsClient().on("error", () => {
            console.log('test err')
            process.exit(0);
        });

        connectToScriptnet( script_event_emitter )

        refreshToken( script_event_emitter );

        console.log("doneCallback finished")
    }

}

function connectToScriptnet( script_event_emitter ){

    // oauth stuff
    addExpressEndpoint( script_event_emitter, "/automatic_obd/oauth", "automatic_obd", "ALL", EventStrings.AUTOMATIC_OBD_OAUTH_CLOUD );
    bindCloudEventToLocalEvent( script_event_emitter, EventStrings.AUTOMATIC_OBD_OAUTH_CLOUD, EventStrings.AUTOMATIC_OBD_OAUTH_LOCAL )
    addHttpEvent( script_event_emitter, EventStrings.AUTOMATIC_OBD_OAUTH_LOCAL,  oauthCallback);

    // event stuff
    addExpressEndpoint( script_event_emitter, "/automatic_obd/events", "automatic_obd", "ALL", EventStrings.AUTOMATIC_OBD_EVENTS_CLOUD );
    bindCloudEventToLocalEvent( script_event_emitter, EventStrings.AUTOMATIC_OBD_EVENTS_CLOUD, EventStrings.AUTOMATIC_OBD_EVENTS_LOCAL )
    addHttpEvent( script_event_emitter, EventStrings.AUTOMATIC_OBD_EVENTS_LOCAL,  obdEventsCallback);

    async function oauthCallback( data ):Promise<HttpReturn>{

        return new Promise(( resolve, reject )=>{

            console.log("data");

            const {code} = data.event.data.query;
            const {client_id, client_secret} = obd_data;

            console.log({client_id, client_secret, code})

            const options = {
                method: 'POST',
                url: 'https://accounts.automatic.com/oauth/access_token',
                form:
                {
                    code,
                    client_id,
                    client_secret,
                    grant_type: 'authorization_code',
                    undefined: undefined
                }
            };

            requestP( options ).then(( resp_data )=>{

                resp_data = JSON.parse( resp_data );

                fs.writeFileSync( client_token_location, JSON.stringify(resp_data, null, 2) );

                resolve({
                    status:200, 
                    msg:resp_data,
                    type:"application/json", 
                    msg_only:true
                });

                const timeout = resp_data.expires_in/2;
                setTimeout(()=>{
                    refreshToken( script_event_emitter );
                }, timeout);
            });

        });
    }
}

async function refreshToken( script_event_emitter:ScriptEventEmitter ){

    if( fs.existsSync(client_token_location) ){

        const client_token_json = JSON.parse( fs.readFileSync(client_token_location).toString() );

        const {client_id, client_secret} = obd_data;
        const {refresh_token} = client_token_json;

        const options = {
            method: 'POST',
            url: 'https://accounts.automatic.com/oauth/access_token',
            form:
            {
                refresh_token,
                client_id,
                client_secret,
                grant_type: 'refresh_token',
                undefined: undefined
            }
        };

        requestP( options ).then(( resp_data )=>{

            resp_data = JSON.parse( resp_data );

            fs.writeFileSync( client_token_location, JSON.stringify(resp_data, null, 2) );


            const timeout = resp_data.expires_in/2;
            console.log(`refreshing token in ${timeout} ms`)
            setTimeout(()=>{
                refreshToken( script_event_emitter );
            }, timeout);
        });


    }else{
        startOAuth( script_event_emitter );
    }
}

function startOAuth( script_event_emitter:ScriptEventEmitter ){

        const start_oauth_event:CloudEventContainer = {
            device_meta_data:{}, 
            event_name:EventStrings.CLOUD_NOTIFY, 
            event:{
                event_type: WsEventType.PLAIN,
                uuid: uuid_v4(),
                data: { 
                    title:"Click to do OAuth",
                    text:"Click to do OAuth",
                    url:"https://accounts.automatic.com/oauth/authorize/?client_id=cf4234c39e73c53258ce&response_type=code&scope=scope:public%20scope:user:profile%20scope:location%20scope:vehicle:profile%20scope:vehicle:events%20scope:trip%20scope:behavior"
                },
            }
        };
        script_event_emitter.emitToCloudPromise(start_oauth_event);
}

export default start;
