enum Status{
    DONE = "DONE", // can resolve request to requestor 
    NEW = "NEW", // new request from requestor
    ERROR = "ERROR", // request has encountered an error 
}

export default Status;