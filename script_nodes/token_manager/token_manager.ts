import {ScriptEventEmitter, uuid_v4} from "../../classes/ScriptEventEmitter.class"
import {WsEventType, AddExpressEndpointContainer, CloudEventContainer, EventStrings, LocalEventEntry} from "../../interfaces/script_loader.interface"
import {ScriptNetClientObj, } from "../../interfaces/ScriptnetObj.interface"

const fs = require("fs");

try{
    start()
}catch(e){

}

function start() {
    try {
        doStart();
    }catch(e){
        console.error("failed to start install host");
    }
}

function doStart(){

    const config = require("config");

    const local_config = config.util.loadFileConfigs(__dirname+"/config");

    const token_file_path = __dirname+local_config.token_file_path;
    console.log("{token_file_path}")
    console.log({token_file_path})

    const get_token_timeout = 30*1000;

    console.log(local_config);

    //const scriptnet_server_obj = local_config.local_scriptnet_server_obj
    const scriptnet_server_obj = local_config.remote_scriptnet_server_obj

    const scriptnet_client_obj:ScriptNetClientObj = local_config.scriptnet_client_obj;
    scriptnet_client_obj.connection_id = uuid_v4();

    new ScriptEventEmitter(scriptnet_server_obj,scriptnet_client_obj, doneCallback);

    function doneCallback( script_event_emitter:ScriptEventEmitter ){

        if ( !fs.existsSync(token_file_path) ||true /* TOOD remove the or true so it doesn't always ask for token */ ){
            console.error("need to get token hash");

            let should_send_notification = true;

            let interval_obj;

            const intervalFunct = ()=>{

                const time = (new Date()).toString();

                const get_hash_obj:CloudEventContainer = {
                    device_meta_data:{},
                    event_name:EventStrings.GET_TOKEN_HASH_OBJ,
                    event:{
                        event_type:WsEventType.PLAIN,
                        uuid:uuid_v4(),
                        data:{time},
                    }
                };

                script_event_emitter.emitToCloudPromise( get_hash_obj )
                .then((data:CloudEventContainer)=>{

                    console.log(data);
                    fs.writeFileSync(token_file_path, JSON.stringify(data.event.data.token_hash));

                    console.log("writing "+token_file_path)

                    clearInterval(interval_obj);

                    console.log("saved token to file");

                    should_send_notification = false;
                }).catch(()=>{
                    console.log("didn't get token file")
                });

                console.log("requested token file")

            };

            interval_obj = setInterval(intervalFunct, 30000);

            intervalFunct();

        }else{
            console.log( "token hash file exsists" );
        }

        const event_to_add:LocalEventEntry = {
            cloud_event_string:EventStrings.GET_TOKEN_HASH_OBJ,
            required_keys_table:null,
            script_event_string:EventStrings.GET_TOKEN_HASH_OBJ,
        };

        script_event_emitter.addRegisteredEvent(event_to_add);

        script_event_emitter.on_smart( EventStrings.GET_TOKEN_HASH_OBJ, ()=>{

            return new Promise((resolve, reject)=>{

                // TODO phone notification here

                console.log("got request for token");
                console.log("checking "+token_file_path)

                if( fs.existsSync(token_file_path) ){
    
                    const token_hash = fs.readFileSync(token_file_path).toString();;

                    console.log("reading "+token_file_path)

                    console.log({token_hash});

                    resolve({
                        token_hash
                    });
                }
            })

        });

        console.log("doneCallback finished");
    }
}

export default start;