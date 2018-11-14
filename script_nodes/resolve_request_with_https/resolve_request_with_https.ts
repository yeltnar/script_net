import {ScriptEventEmitter, uuid_v4} from "../../classes/ScriptEventEmitter.class"
import {WsEventType, AddExpressEndpointContainer, CloudEventContainer, EventStrings} from "../../interfaces/script_loader.interface"
import {ScriptNetClientObj} from "../../interfaces/ScriptnetObj.interface"


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

    const scriptnet_server_obj = local_config.lan_scriptnet_server_obj
    //const scriptnet_server_obj = local_config.local_scriptnet_server_obj
    //const scriptnet_server_obj = local_config.remote_scriptnet_server_obj

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
                    router_name:"resolve_uuid",
                    express_string:"/resolve_uuid",
                    http_method:"ALL",
                    cloud_event_string:EventStrings.RESOLVE_UUID_CLOUD
                }
            },
            device_meta_data:{},
            event_name:EventStrings.ADD_EXPRESS_ENDPOINT,
        };
        
        // add express endpoint that emits event
        script_event_emitter.emitToCloud( x ); 

        // register for same event you emit from express
        script_event_emitter.addRegisteredEvent({
            cloud_event_string:EventStrings.RESOLVE_UUID_CLOUD,
            required_keys_table:null,
            script_event_string:EventStrings.RESOLVE_UUID_CLIENT,
        });

        // react to express request 
        script_event_emitter.on_smart_http( EventStrings.RESOLVE_UUID_CLIENT , async( data )=>{

            const {uuid} = data.event.data.query;

            const msg = uuid||"uuid not provided";//fs.readFileSync(__dirname+"/install.sh").toString();

            if( uuid ){
                script_event_emitter.resolveToCloud( uuid, {}/* data */ );
            }
            
            return {
                status:200,
                msg,
                type:"text/plain",
                msg_only:true
            };
        });

        // ************ pending resolve ************
        const pending_resolve_event:AddExpressEndpointContainer = {
            event:{
                event_type:WsEventType.ADD_EXPRESS_ENDPOINT,
                uuid: uuid_v4(),
                data:{
                    router_name:"pending_resolve",
                    express_string:"/pending_resolve",
                    http_method:"ALL",
                    cloud_event_string:EventStrings.PENDING_RESOLVE_CLOUD
                }
            },
            device_meta_data:{},
            event_name:EventStrings.ADD_EXPRESS_ENDPOINT,
        };
        
        // add express endpoint that emits event
        script_event_emitter.emitToCloud( pending_resolve_event ); 

        // register for same event you emit from express
        script_event_emitter.addRegisteredEvent({
            cloud_event_string:EventStrings.PENDING_RESOLVE_CLOUD,
            required_keys_table:null,
            script_event_string:EventStrings.PENDING_RESOLVE_LOCAL,
        });

        // react to express request 
        script_event_emitter.on_smart_http( EventStrings.PENDING_RESOLVE_LOCAL , ( data )=>{

            return new Promise((resolve, reject)=>{

                const uuid = uuid_v4()

                //const msg = uuid;//fs.readFileSync(__dirname+"/install.sh").toString();

                const {script_name,device_name,group_name} = data.event.data;

                const title = "Click to allow entry";
                const text = {script_name,device_name,group_name};
                const url = scriptnet_server_obj.http_protocol+"://"+scriptnet_server_obj.address+"/resolve_uuid?uuid="+uuid;

                const notify_container:CloudEventContainer = {
                    device_meta_data:{},
                    event_name:EventStrings.CLOUD_NOTIFY,
                    event:{
                        event_type:WsEventType.PLAIN,
                        uuid:uuid_v4(),
                        data:{ title, text, url },
                    },
                };
                script_event_emitter.emitToCloud( notify_container ); // TODO add back

                const pending_container:CloudEventContainer = {
                    device_meta_data:{},
                    event_name:EventStrings.START_PENDING_CLOUD,
                    event:{
                        event_type:WsEventType.PLAIN,
                        uuid,
                        data:{ text, title },
                    },
                };
                script_event_emitter.emitToCloudPromise( pending_container ).then(( data )=>{
                    
                    console.log("")
                    console.log("DONE EventStrings.PENDING_RESOLVE_LOCAL")
                    console.log(EventStrings.PENDING_RESOLVE_LOCAL)
                
                    resolve ({
                        status:200,
                        msg:data,
                        type:"application/json",
                        msg_only:true
                    });

                }).catch(()=>{
                    resolve({
                        status:500,
                        msg:"no response",
                        type:"text/plain",
                        msg_only:true
                    })
                });

                console.log('\npending uuid is '+uuid);

                console.log("")
                console.log("")
                console.log("")
                console.log("START EventStrings.PENDING_RESOLVE_LOCAL")
                console.log(EventStrings.PENDING_RESOLVE_LOCAL)
            });
        });

        console.log("doneCallback finished")

    }
}

export default start;