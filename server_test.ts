// start of server code
import {ScriptnetServer} from "./classes/ScriptnetServer/ScriptnetServer.class"

const scriptnet_server = new ScriptnetServer( doneCallback );


import {ScriptNetServerObj,ScriptNetClientObj} from "./interfaces/ScriptnetObj.interface"
import {ScriptEventEmitter, uuid_v4} from "./classes/ScriptEventEmitter.class"
import {EventStrings, CloudEventContainer, WsEventType, AddExpressEndpointContainer} from "./interfaces/script_loader.interface"


function doneCallback(){


    return 

    
    const scriptnet_server_obj:ScriptNetServerObj = {
        protocol:"ws",
        address:"127.0.0.1:3000"
    };

    const scriptnet_client_obj:ScriptNetClientObj = {
        parser_name:"http_test_parser",
        device_name:"test_device",
        group_name:"test_group",
        parser_token:"test_token"
    };

    const script_event_emitter = new ScriptEventEmitter(scriptnet_server_obj,scriptnet_client_obj);

    script_event_emitter.ws_client.on("error", ()=>{
        console.log('test err')
        process.exit(0);
    })

    script_event_emitter.ws_client.on("open", ()=>{

        const x:AddExpressEndpointContainer = {
            event:{
                event_type:WsEventType.ADD_EXPRESS_ENDPOINT,
                uuid: uuid_v4(),
                data:{
                    router_name:"test123",
                    express_string:"/test123",
                    http_method:"ALL",
                    cloud_event_string:"test_http_event_cloud"
                }
            },
            device_meta_data:{},
            event_name:WsEventType.ADD_EXPRESS_ENDPOINT,
        };
        
        // add express endpoint that emits event
        script_event_emitter.emitToCloud( x ); 

        // register for same event you emit frome express
        script_event_emitter.addRegisteredEvent({
            cloud_event_string:"test_http_event_cloud",
            required_keys_table:null,
            script_event_string:"test_http_event",
        });

        // react to express request 
        script_event_emitter.on_smart( "test_http_event" , async( data )=>{
        
            console.log();
            console.log(data);
            console.log();
            const time = (new Date()).getTime();
            return {time};
        });
    });

}