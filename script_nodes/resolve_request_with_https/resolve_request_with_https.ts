import {ScriptEventEmitter, uuid_v4} from "../../classes/ScriptEventEmitter.class"
import {WsEventType, AddExpressEndpointContainer, CloudEventContainer, EventStrings} from "../../interfaces/script_loader.interface"
import {ScriptNetClientObj} from "../../interfaces/ScriptnetObj.interface"

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

    console.log(local_config);

    const scriptnet_server_obj = local_config.local_scriptnet_server_obj
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

        // SECOND TEST 

        const x2:AddExpressEndpointContainer = {
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
            event_name:WsEventType.ADD_EXPRESS_ENDPOINT,
        };
        
        // add express endpoint that emits event
        script_event_emitter.emitToCloud( x2 ); 

        // register for same event you emit from express
        script_event_emitter.addRegisteredEvent({
            cloud_event_string:EventStrings.PENDING_RESOLVE_CLOUD,
            required_keys_table:null,
            script_event_string:EventStrings.PENDING_RESOLVE_LOCAL,
        });

        // react to express request 
        script_event_emitter.on_smart_http( "req_test_client" , async( data )=>{
        
            console.log();
            console.log("req_test_client");
            console.log(data);
            console.log();
            const time = (new Date()).getTime();
            const client = "client";
            
            return {
                status:200,
                msg:data,
                type:"application/json",
                msg_only:false
            };
                console.log("START EventStrings.PENDING_RESOLVE_LOCAL")
                console.log(EventStrings.PENDING_RESOLVE_LOCAL)
        });


        console.log("doneCallback finished")

    }
}

export default start;