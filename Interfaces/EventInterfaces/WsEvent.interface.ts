enum Status{
    DONE = "DONE", // can resolve request to requestor 
    NEW = "NEW", // new request from requestor
    ERROR = "ERROR", // request has encountered an error 
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

interface WsEvent{
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

export default WsEvent