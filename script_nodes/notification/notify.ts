import {ScriptEventEmitter, uuid_v4} from "../../classes/ScriptEventEmitter.class"
import {WsEventType, AddExpressEndpointContainer, CloudEventContainer, checkCloudEventContainer, EventContainer} from "../../interfaces/script_loader.interface"
import {ScriptNetClientObj} from "../../interfaces/ScriptnetObj.interface"

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
                    router_name:"notify",
                    express_string:"/notify",
                    http_method:"ALL",
                    cloud_event_string:"cloud_notify_http"
                }
            },
            device_meta_data:{},
            event_name:WsEventType.ADD_EXPRESS_ENDPOINT,
        };
        
        // add express endpoint that emits event
        script_event_emitter.emitToCloud( x ); 

        // register for same event you emit from express
        script_event_emitter.addRegisteredEvent({
            cloud_event_string:"cloud_notify_http",
            required_keys_table:null,
            script_event_string:"local_notify_http",
        });

        // react to express request 
        script_event_emitter.on_smart_http( "local_notify_http" , ( data )=>{

            return new Promise((resolve, reject) => {

                const { text, title } = data.event.data.query;

                if( title===undefined || text===undefined ){

                    resolve({
                        status: 200,
                        msg: JSON.stringify({title:"is required",text:"is required"}),
                        type: "application/json",
                        msg_only: true
                    });

                }else{

                    // requestP({
                    //     method: 'GET',
                    //     url: 'https://joinjoaomgcd.appspot.com/_ah/api/messaging/v1/sendPush',
                    //     qs:
                    //     {
                    //         deviceId,
                    //         text,
                    //         title,
                    //         apikey,
                    //     }
                    // })

                    const cloud_event_container:CloudEventContainer = {
                        device_meta_data:{},
                        event_name:"cloud_notify",
                        event:{
                            event_type: WsEventType.PLAIN,
                            uuid: uuid_v4(),
                            data: { text, title }
                        },
                    };

                    script_event_emitter.emitToCloudPromise( cloud_event_container )
                    .then(( resp )=>{
        
                        console.log('in then for notify request ')
        
                        resolve({
                            status: 200,
                            //msg: JSON.stringify(data.event.data.query),
                            //msg: JSON.stringify(resp),
                            msg: (resp),
                            type: "application/json",
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
            cloud_event_string:"cloud_notify",
            required_keys_table:null,
            script_event_string:"local_notify",
        });

        // react to express request 
        script_event_emitter.on_smart( "local_notify" , ( data )=>{

            return new Promise((resolve, reject) => {

                const { text, title } = data.event.data;

                console.log(data.event)
                console.log("on local notify "+text+" "+title);
                // process.exit();

                if( title===undefined || text===undefined ){

                    resolve({
                        status: 200,
                        msg: {title:"is required",text:"is required"},
                        type: "application/json",
                        msg_only: true
                    });

                }else{

                    requestP({
                        method: 'GET',
                        url: 'https://joinjoaomgcd.appspot.com/_ah/api/messaging/v1/sendPush',
                        qs:
                        {
                            deviceId,
                            text,
                            title,
                            apikey,
                        }
                    }).then(( resp )=>{
        
                        console.log('in then for notify request ')
        
                        resolve({
                            status: 200,
                            //msg: JSON.stringify(data.event.data.query),
                            //msg: JSON.stringify(resp),
                            msg: (resp),
                            type: "application/json",
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

        console.log("doneCallback finished")

    }

}

export default start;