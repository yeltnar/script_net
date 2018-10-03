import WsMessage from "./../EventInterfaces/WsMessage.interface"
import WsEventType from "../WsEventType.enum";
import Status from "../Status.enum";

interface InitMessage extends WsMessage{
    name:string,
    device:string,
    group:string,
    // git hash
    registered_events:Array<{
        type?: WsEventType,
        status?: Status,
    }>
}

export default InitMessage;