import { ScriptEventEmitter, uuid_v4, EventEmitterCallback, EventEmitterCallbackHttp } from "../classes/ScriptEventEmitter.class"
import { WsEventType, AddExpressEndpointContainer, EventStrings } from "../interfaces/script_loader.interface"

function addExpressEndpoint(script_event_emitter: ScriptEventEmitter, express_string: string, router_name: string, http_method: "GET" | "POST" | "DELETE" | "ALL", cloud_event_string: EventStrings) {

    const x: AddExpressEndpointContainer = {
        event: {
            event_type: WsEventType.ADD_EXPRESS_ENDPOINT,
            uuid: uuid_v4(),
            data: {
                router_name,
                express_string,
                http_method,
                cloud_event_string
            }
        },
        device_meta_data: {},
        event_name: EventStrings.ADD_EXPRESS_ENDPOINT,
    };

    // add express endpoint that emits event
    script_event_emitter.emitToCloud(x);

}

function bindCloudEventToLocalEvent(script_event_emitter: ScriptEventEmitter, cloud_event_string: EventStrings, script_event_string: EventStrings, required_keys_table = null) {
    // register for same event you emit from express
    script_event_emitter.addRegisteredEvent({
        cloud_event_string,//"cloud_notify_http",
        required_keys_table,
        script_event_string,//"local_notify_http",
    });

}

function addEvent(script_event_emitter: ScriptEventEmitter, event_string: EventStrings, f: EventEmitterCallback) {
    return script_event_emitter.on_smart(event_string, f);
}

function addHttpEvent(script_event_emitter: ScriptEventEmitter, event_string, f: EventEmitterCallbackHttp) {
    return script_event_emitter.on_smart_http(event_string, f);
}

export { addExpressEndpoint, bindCloudEventToLocalEvent, addEvent, addHttpEvent }
