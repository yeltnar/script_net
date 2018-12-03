import {ScriptEventEmitter, uuid_v4} from "../../classes/ScriptEventEmitter.class"
import {ScriptNetClientObj} from "../../interfaces/ScriptnetObj.interface"
import {WsEventType, AddExpressEndpointContainer, CloudEventContainer, checkCloudEventContainer, EventContainer, EventStrings} from "../../interfaces/script_loader.interface"

const requestP = require('request-promise-native');
const chalk = require('chalk')
const config = require('config');

const {token} = config;

process.stdin.on("data", (chunk)=>{
    return

    const shell = chunk.toString()

    const options = {
        method: 'POST',
        url: 'http://ws-expose.mybluemix.net/shell',
        qs: {
            token
        },
        headers: {
            'Content-Type': 'application/json'
        },
        body: {
            shell
        },
        json: true
    };

    requestP(options).then(( data )=>{
        data = data || "[no data]\n";
        process.stdout.write(chalk.yellowBright(data)+"-----\n");
    })

    //console.log(chunk.toString());
    
});


function start(){
    try{
        console.log("stdin.test starting")
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


        script_event_emitter.getWsClient().on("error", ()=>{
            console.log('test err')
            process.exit(0);
        });

        process.stdin.on("data", (chunk)=>{

            const shell = chunk.toString()

            const shell_event:CloudEventContainer = {
                device_meta_data:{
                    device_name:"pi"
                },
                event_name:EventStrings.SHELL,
                event:{
                    event_type:WsEventType.PLAIN,
                    uuid:uuid_v4(),
                    data:{
                        shell
                    }
                },

            };
            
            // add express endpoint that emits event
            script_event_emitter.emitToCloudPromise( shell_event ).then((data)=>{
                console.log()
                const shell_response = data.event.data;
                process.stdout.write(chalk.yellowBright(shell_response)+"\n");
            }); 

            //console.log(chunk.toString());
            
        });
    }
}

start()