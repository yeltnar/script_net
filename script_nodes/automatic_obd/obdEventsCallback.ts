import { WsEventType, CloudEventContainer, EventStrings } from "../../interfaces/script_loader.interface"
import { ScriptEventEmitter, uuid_v4, HttpReturn } from "../../classes/ScriptEventEmitter.class"

function setup_obdEventsCallback( script_event_emitter:ScriptEventEmitter ){

    return async function obdEventsCallback( data ):Promise<HttpReturn>{

        const status = 200;
        const msg = "200";
        const response_type = "application/json";
        const msg_only = true;
    
        console.log()
        console.log( JSON.stringify(data.event.data.body, null, 2) )
        console.log()
    
        const {type, created_at, id} = data.event.data.body;
    
        let should_notify = false;
    
        if( type==="ignition:off" ){
    
            should_notify = true;
    
        }else if( type==="ignition:on" ){
    
            should_notify = true;
    
        }else if( type==="trip:finished" ){
    
            should_notify = true;
    
        }else if( type==="mil:on" ){
    
            should_notify = true;
    
        }
    
        if( should_notify ){
    
            const start_oauth_event:CloudEventContainer = {
                device_meta_data:{}, 
                event_name:EventStrings.CLOUD_NOTIFY, 
                event:{
                    event_type: WsEventType.PLAIN,
                    uuid: uuid_v4(),
                    data: { 
                        title: type+" "+(new Date()).toString(),
                        text:JSON.stringify({
                            created_at:(new Date(created_at)).toString(), 
                            id
                        })
                    },
                }
            };
            script_event_emitter.emitToCloudPromise(start_oauth_event);
        }
    
        return {
            status, 
            msg, 
            type:response_type, 
            msg_only
        };
    }
}

export {setup_obdEventsCallback}