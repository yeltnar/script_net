enum Status{
    DONE = "DONE", // can resolve request to requestor 
    NEW = "NEW", // new request from requestor
    ERROR = "ERROR", // request has encountered an error 
}

enum WsEventType{
    HTTP = "HTTP", // message coming from express
    PLAIN = "PLAIN", // message coming from inside the app 
    INFO = "INFO", // info message (prob won't be acted on)
    INIT = "INIT", // message from a client initalizing itself 
    ADD_EVENT = "ADD_EVENT"
}

// generic message to be sent anywhere 
interface WsMessage{
    
}

interface HttpMessage extends WsMessage{
    request:object,
    url:string,
    query_body:object
}

interface MessageResult{
    
}

interface HttpMessageResult extends MessageResult {
    status:number,
}

interface old_WsEvent{
    uuid:string,
    type: WsEventType,
    status:Status,
    target?:{ // optional target information 
        parser?:string,
        device?:string,
        group?:string,
    },
    message:WsMessage,
    result?:MessageResult // need to check for this before send back
}

interface WsEvent{
    event_obj:{
        event:string,
    },
    type:WsEventType,
    data:object
}

export {WsEvent,WsEventType}