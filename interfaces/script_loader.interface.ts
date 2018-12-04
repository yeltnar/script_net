enum WsEventType{
    HTTP = "HTTP", // message coming from express
    PLAIN = "PLAIN", // message coming from inside the app 
    INFO = "INFO", // info message (prob won't be acted on)
    //INIT = "INIT", // message from a client initalizing itself  // TODO remove? this is handled by the connection request
    
    ADD_EVENT = "ADD_EVENT", // add event string to be listened for 
    ADD_ONCE_EVENT = "ADD_ONCE_EVENT", // add event string to be listened for 
    
    ADD_EXPRESS_ENDPOINT = "ADD_EXPRESS_ENDPOINT", // add event string to be listened for 
    REMOVE_EXPRESS_ENDPOINT = "REMOVE_EXPRESS_ENDPOINT", // add event string to be listened for 
    
    VERIFIER_CONNECTED = "VERIFIER_CONNECTED", // add event string to be listened for 
    VERIFIER_DISCONNECTED = "VERIFIER_DISCONNECTED", // add event string to be listened for 

    DONE = "DONE",
    ERROR = "ERROR"
}

enum  EventStrings{
    RESOLVE_EVENT = "RESOLVE_EVENT",
    ADD_EXPRESS_ENDPOINT = "ADD_EXPRESS_ENDPOINT",
    REMOVE_EXPRESS_ENDPOINT = "REMOVE_EXPRESS_ENDPOINT",
    GREET = "GREET",

    GET_TOKEN_HASH_OBJ = "GET_TOKEN_HASH_OBJ",
    RESOLVE_UUID_EVENT = "RESOLVE_UUID_EVENT",
    ADD_CLOUD_EVENT = "ADD_CLOUD_EVENT",

    RESOLVE_UUID_CLOUD = "RESOLVE_UUID_CLOUD",
    RESOLVE_UUID_CLIENT = "RESOLVE_UUID_CLIENT",
    PENDING_RESOLVE_CLOUD = "PENDING_RESOLVE_CLOUD",
    PENDING_RESOLVE_LOCAL = "PENDING_RESOLVE_LOCAL",
    START_PENDING_CLOUD = "START_PENDING_CLOUD",

    CLOUD_NOTIFY_HTTP = "CLOUD_NOTIFY_HTTP",
    LOCAL_NOTIFY_HTTP = "LOCAL_NOTIFY_HTTP",
    CLOUD_NOTIFY = "CLOUD_NOTIFY",
    LOCAL_NOTIFY = "LOCAL_NOTIFY",

    SHELL = "SHELL",
    SHELL_HTTP = "SHELL_HTTP",

    VERIFIER_CONNECTED = "VERIFIER_CONNECTED",
    VERIFIER_DISCONNECTED = "VERIFIER_DISCONNECTED",
    REQUEST_VERIFICATION = "REQUEST_VERIFICATION",

}

// registers an attached device 
// this isn't used... the smaller types are more important 
interface ScriptLoader {
    // version of filter that will be sending on to connected client ... need good versioning here

    filter_version:string, 

    script_name:string,
    device_name:string,
    group_name:string,
    
    // list of events to try to match with
    cloud_event_string_list:[string],

    // list of events to send in ws { "event_name":"string", "data":{} }
    local_event_table:[LocalEventEntry], 

    // express events should send the simplified request object with the event to the cloud event emitter
    express_event_table?:[
        {
            express_string:string, //"/test123",
            event_string:string, //"TEST_123",
            resolve_event_string:string //"TEST_123-${uuid}" // this must have ${uuid} in order to resolve the pending request 
            // do I need the previous one or is uuid enough?
        }
    ]
}
interface LocalEventEntry{
    cloud_event_string:EventStrings,   // brodcast cloud event to be watching for
    required_keys_table:[RequiredKeysElement], // checks the EventContainer.event.data contents 
    script_event_string:EventStrings, // check out LocalWsEventContainer... the event_name is this exact field 
}

// list of keys (and optional values) that need to be there for the event to continue
interface RequiredKeysElement{
    "key":string,
    "value"?:string, // either value or required_keys_table should be present if neither then only check its presence
    "required_keys_table"?:RequiredKeysElement // either value or required_keys_table should be present if neither then only check its presence
}

// event object that can be sent to ws or other event emitter applications
interface EventContainer{
    event_name:EventStrings,
    event:{
        event_type:WsEventType,
        uuid:string,
        data:any
    }
}

interface CloudEventContainer extends EventContainer{
    device_meta_data:{
        script_name?:string,
        device_name?:string,
        group_name?:string,
    },
    sender_device_meta_data?:{
        script_name:string,
        device_name:string,
        group_name:string,
        connection_id:string,
    }
}

interface AddEventContainer extends EventContainer{
    event:{
        event_type:WsEventType.ADD_EVENT|WsEventType.ADD_ONCE_EVENT,
        uuid:string,
        data:LocalEventEntry
    }
}

interface AddExpressEndpointContainer extends CloudEventContainer{
    event:{
        event_type:WsEventType.ADD_EXPRESS_ENDPOINT,
        uuid:string,
        data:{
            router_name:string,
            express_string:string,
            http_method:"GET"|"POST"|"DELETE"|"ALL",
            cloud_event_string:EventStrings,
            allow_keep_router_name?:boolean
        }
    }
}

interface RemoveExpressRouterContainer extends CloudEventContainer{
    event:{
        event_type:WsEventType.REMOVE_EXPRESS_ENDPOINT,
        uuid:string,
        data:{
            router_name:string
        }
    },
    event_name:EventStrings.REMOVE_EXPRESS_ENDPOINT
}

interface ExpressReplyContainer extends CloudEventContainer{
    event:{
        event_type:WsEventType.DONE,
        uuid:string,
        data:any // TODO make this the modified request obj
    }
}

// express response interface TODO

function checkEventContainer( ec:EventContainer ):boolean{

    const check = ec.event_name!==undefined 
        && ec.event!==undefined 
        && ec.event.data!==undefined 
        && ec.event.event_type!==undefined 
        && ec.event.uuid!==undefined;

    if( check===true ){
        return check;
    }else{
        console.error( "***ec***" )
        console.error( ec )
        throw new Error("checkEventContainer test failed!");
    }
}

function checkCloudEventContainer( cec:CloudEventContainer ):boolean{
    let check = checkEventContainer( cec )
        && cec.device_meta_data!==undefined

    if( check===true ){ 
        return check;
    }else{
        throw new Error("checkCloudEventContainer test failed!");
    }
}

interface EventEmitterCallback {
    (data: CloudEventContainer): Promise<object>;
}

export {
    WsEventType, 
    ScriptLoader, 
    RequiredKeysElement, 
    EventContainer, 
    CloudEventContainer, 
    checkEventContainer, 
    checkCloudEventContainer, 
    AddEventContainer, 
    LocalEventEntry, 
    EventStrings,
    AddExpressEndpointContainer,
    RemoveExpressRouterContainer,
    ExpressReplyContainer,
    EventEmitterCallback
}

// let script_loader_example:ScriptLoader = {

//     filter_version:"0",

//     device_name:"test_device",
//     group_name:"test_group",
//     script_name:"test_script",
    
//     cloud_event_string_list:[
//         "TEST_123"
//     ],

    
//     local_event_table:[
//         {
//             // when TEST_123 happens and the keys match fire 123_TEST on ws connection 
//             cloud_event_string:"TEST_123",
//             required_keys_table:[
//                 {
//                     key:"body"
//                 }
//             ],
//             script_event_string:"123_TEST"
//         }
//     ]
// };

// //example event
// let example_event:EventContainer = {
//     event_name:"test123",
//     event:{
//         event_type:WsEventType.PLAIN,
//         uuid:"1111111111",
//         data:{}
//     }
// }

// //example resolve event
// let example_resolve_event:EventContainer = {
//     event_name:"1111111111", // event_name and uuid should be the same in a resolving event
//     event:{
//         event_type:WsEventType.DONE,
//         uuid:"1111111111", // event_name and uuid should be the same in a resolving event
//         data:{}
//     }
// };