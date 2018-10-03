enum WsEventType{
    HTTP = "HTTP", // message coming from express
    STANDARD = "STANDARD", // message coming from inside the app 
    INFO = "INFO", // info message (prob won't be acted on)
    INIT = "INIT", // message from a client initalizing itself 
}

export default WsEventType;