import {ScriptEventEmitter, uuid_v4} from "../../classes/ScriptEventEmitter.class"
import {WsEventType, AddExpressEndpointContainer, CloudEventContainer, checkCloudEventContainer, EventContainer, EventStrings} from "../../interfaces/script_loader.interface"
import {ScriptNetClientObj} from "../../interfaces/ScriptnetObj.interface"
import sha512HexHash from "../../helpers/crypto"

import get_script_net_connector_token from "../../helpers/uuid_token_manager";

const {exec, execFile} = require("child_process")
const config = require("config");
const requestP = require("request-promise-native");

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
    scriptnet_client_obj.script_net_connector_token = get_script_net_connector_token();

    new ScriptEventEmitter(scriptnet_server_obj,scriptnet_client_obj, doneCallback);

    function doneCallback( script_event_emitter:ScriptEventEmitter ){

        console.log( "in doneCallback" );

        script_event_emitter.getWsClient().on("error", ()=>{
            console.log('test err')
            process.exit(0);
        });

        const start_ping_event:CloudEventContainer = {
            device_meta_data:{},
            event_name:EventStrings.SHELL,
            event:{
                event_type:WsEventType.PLAIN,
                uuid:uuid_v4(),
                data:{
                    shell:"date"
                }
            }
        };

        let numerator = 0;
        let denominator = 0;

        const interval_obj = setInterval(ping, 200);

        // for( let i=0; i<1000; i++ ){
        //     ping()
        // }

        function ping(){

            const start = (new Date()).getTime();
    
            script_event_emitter.emitToCloudPromise( start_ping_event ).then(( data )=>{

                const delta = ( ((new Date()).getTime()) - start );
                numerator += delta;
                denominator++;

                console.log( "\ncur: "+delta+"\ncount: "+denominator+"\navg: "+numerator/denominator+"\n" );

                if( denominator===1000 ){
                    process.exit(1);
                }

            });

        }

        console.log("doneCallback finished")

    }

}

export default start;

function shellTokenCheck( token ){
    console.warn("");
    console.warn("");
    console.warn("need to do tokens better");
    console.warn("");
    console.warn("");
    return sha512HexHash(token)==="f11c3f6e0a268fc4ee58d97fa897f12fa8d5dea9e08e39c55daafb3ceeb16a067c675cdf0eebd1d0f298ee70dcfb721d249b001fbb5e8b4b16a455c76e6e93ea";
}


// TODO move to helper

function execPromise(command){
    return new Promise((resolve, reject)=>{


        exec(command, (err, stdout, stderr)=>{
            if(err){
                console.error(err)
                console.error(command+" failed exec err")
                return reject(err);
            }else if(stderr){
                console.log(command+" failed stderr "+stderr)
                return resolve(stderr);
            }else{
                console.log(command+" success "+stdout)
                return resolve(stdout);
            }
        });
    })
}