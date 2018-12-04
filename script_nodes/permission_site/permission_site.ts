import {ScriptEventEmitter, uuid_v4} from "../../classes/ScriptEventEmitter.class"
import {WsEventType, AddExpressEndpointContainer, CloudEventContainer, EventStrings, EventContainer} from "../../interfaces/script_loader.interface"
import {ScriptNetClientObj} from "../../interfaces/ScriptnetObj.interface"

let okay_token = "okay_token";

function start() {
    try {
        doStart();
    }catch(e){
        console.error(e);
        console.error("failed to start install resolve request with host");
    }
}

function doStart(){

    const config = require("config");

    const local_config = config.util.loadFileConfigs(__dirname+"/config");

    console.log(local_config);

    //const scriptnet_server_obj = local_config.lan_scriptnet_server_obj
    //const scriptnet_server_obj = local_config.local_scriptnet_server_obj
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

        const add_resolve_uuid_endpoint:AddExpressEndpointContainer = {
            event:{
                event_type:WsEventType.ADD_EXPRESS_ENDPOINT,
                uuid: uuid_v4(),
                data:{
                    router_name:"permission_site",
                    express_string:"/permission_site",
                    http_method:"ALL",
                    cloud_event_string:EventStrings.PERMISSION_SITE_CLOUD
                }
            },
            device_meta_data:{},
            event_name:EventStrings.ADD_EXPRESS_ENDPOINT,
        };
        
        // add express endpoint that emits event
        script_event_emitter.emitToCloud( add_resolve_uuid_endpoint ); 

        // register for same event you emit from express
        script_event_emitter.addRegisteredEvent({
            cloud_event_string:EventStrings.PERMISSION_SITE_CLOUD,
            required_keys_table:null,
            script_event_string:EventStrings.PERMISSION_SITE_LOCAL,
        });

        // react to express request 
        script_event_emitter.on_smart_http( EventStrings.PERMISSION_SITE_LOCAL , ( data )=>{

            return new Promise((resolve, reject)=>{


                const pending_event:CloudEventContainer = {
                    event_name:EventStrings.PENDING_RESOLVE_CLOUD,
                    event:{
                        event_type:WsEventType.PLAIN,
                        uuid:uuid_v4(),
                        data:{}
                    },
                    device_meta_data:{}
                };

                const query_body = {...data.event.data.query, ...data.event.data.body};
                const {token} = query_body;

                if( token===okay_token ){
                        
                    resolve({
                        status:200,
                        msg:data.event.data,
                        type:"text/plain",
                        msg_only:true
                    });

                }else{

                    okay_token = uuid_v4();

                    script_event_emitter.emitToCloudPromise( pending_event ).then(( approved_data )=>{

                        const location = "https://ws-expose.mybluemix.net/permission_site?token="+okay_token;

                        const msg = '<script>window.open("'+location+'", "_blank")</script>'
                        
                        resolve({
                            status:301,
                            msg,
                            type:"text/html",
                            msg_only:true
                        });
                    })
                }

            })
        });

    }
}

start();
export default start;