import {ScriptEventEmitter, uuid_v4} from "../../classes/ScriptEventEmitter.class"
import {WsEventType, AddExpressEndpointContainer, CloudEventContainer, checkCloudEventContainer, EventContainer, EventStrings} from "../../interfaces/script_loader.interface"
import {ScriptNetClientObj} from "../../interfaces/ScriptnetObj.interface"
import sha512HexHash from "../../helpers/crypto"

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

    new ScriptEventEmitter(scriptnet_server_obj,scriptnet_client_obj, doneCallback);

    function doneCallback( script_event_emitter:ScriptEventEmitter ){

        console.log( "in doneCallback" );

        script_event_emitter.getWsClient().on("error", ()=>{
            console.log('test err')
            process.exit(0);
        });

        const x:AddExpressEndpointContainer = {
            event:{
                event_type:WsEventType.ADD_EXPRESS_ENDPOINT,
                uuid: uuid_v4(),
                data:{
                    router_name:"shell",
                    express_string:"/shell",
                    http_method:"ALL",
                    cloud_event_string:EventStrings.SHELL_HTTP
                }
            },
            device_meta_data:{},
            event_name:EventStrings.ADD_EXPRESS_ENDPOINT,
        };
        
        // add express endpoint that emits event
        script_event_emitter.emitToCloud( x ); 

        // register for same event you emit from express
        script_event_emitter.addRegisteredEvent({
            cloud_event_string:EventStrings.SHELL_HTTP,
            required_keys_table:null,
            script_event_string:EventStrings.SHELL_HTTP,
        });

        // react to express request 
        script_event_emitter.on_smart_http( EventStrings.SHELL_HTTP , ( data )=>{

            return new Promise((resolve, reject) => {

                const query_body = {...data.event.data.query, ...data.event.data.body}

                console.log("query_body for SHELL_HTTP "+JSON.stringify(query_body));

                const { shell, token } = query_body;

                if( shell===undefined || token===undefined ){

                    resolve({
                        status: 200,
                        msg: JSON.stringify({shell:"is required",token:"is required"}),
                        type: "application/json",
                        msg_only: true
                    });

                }else if( !shellTokenCheck(token) ){
                    resolve({
                        status: 401,
                        msg: JSON.stringify({"err":"err"}),
                        type: "application/json",
                        msg_only: true
                    })
                }else{

                    const cloud_event_container:CloudEventContainer = {
                        device_meta_data:{},
                        event_name:EventStrings.SHELL,
                        event:{
                            event_type: WsEventType.PLAIN,
                            uuid: uuid_v4(),
                            data: { shell }
                        },
                    };

                    script_event_emitter.emitToCloudPromise( cloud_event_container )
                    .then(( resp )=>{
        
                        console.log('in then for notify request ')
        
                        resolve({
                            status: 200,
                            msg: (resp.event.data),
                            type: "text/plain",
                            msg_only: true
                        });
        
                    }).catch((err)=>{
                        resolve({
                            status: 500,
                            msg: err,
                            type: "application/json",
                            msg_only: false
                        });
                    });

                }


            })
            
            
        });

        // register for same event you emit from express
        script_event_emitter.addRegisteredEvent({
            cloud_event_string:EventStrings.SHELL,
            required_keys_table:null,
            script_event_string:EventStrings.SHELL,
        });

        // react to express request 
        script_event_emitter.on_smart( EventStrings.SHELL , ( data )=>{

            return new Promise((resolve, reject) => {

                const { shell } = data.event.data;

                console.log(data.event)
                console.log("on local notify "+shell);
                // process.exit();

                if( shell===undefined ){

                    resolve({shell:"is required"});

                }else{

                    console.log("running "+shell)
                    execPromise( shell ).then(resolve)
                }
            })
            
            
        });

        console.log("doneCallback finished")

    }

}

export default start;

function shellTokenCheck( token ){
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