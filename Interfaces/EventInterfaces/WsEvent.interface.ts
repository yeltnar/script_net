enum Status{
    DONE = "DONE", // can resolve request to requestor 
    NEW = "NEW", // new request from requestor
    ERROR = "ERROR", // request has encountered an error 
}

enum WsEventType{
    HTTP = "HTTP", // message coming from express
    PLAIN = "PLAIN", // message coming from inside the app 
    INFO = "INFO", // info message (prob won't be acted on)
    //INIT = "INIT", // message from a client initalizing itself  // TODO remove? this is handled by the connection request
    ADD_EVENT = "ADD_EVENT" // add event string to be listened for 
}

interface EventObj {
    event:string,
    parser_name?:string,
    device_name?:string,
    group_name?:string,
    parser_token?:string
}

interface WsEvent{
    event_obj:EventObj,
    type:WsEventType,
    data?:any,
    // force_live_data:boolean, // force_live_data and allow_caching need to be thought through
    // allow_caching:boolean, // force_live_data and allow_caching need to be thought through
}

interface WsAddEvent extends WsEvent{   
    WsAddEvent_testParam:string
}

export {WsEvent,WsEventType,EventObj,WsAddEvent}