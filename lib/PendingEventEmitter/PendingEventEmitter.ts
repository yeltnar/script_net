const EventEmitter = require("events");
const uuid_v4 = require('uuid/v4');

import {EventObj, WsEvent}  from "../../Interfaces/EventInterfaces/WsEvent.interface";
import sortObject from "../../sortObject"
import { emit } from "cluster";

class PendingEventEmitter{

    // instance of EventEmitter these are stubs so ts knows what can be done
    private locical_event_emitter={ 
        emit:(event:string, data:any)=>{},
        on:(event:string, funct:Function)=>{},
        once:(event:string, funct:Function)=>{
            console.error("!!!!!!!!")
        },
        eventNames:()=>{}
    }; 

    actual_event_emitter={ 
        emit:(event:string, data:any)=>{},
        on:(event:string, funct:Function)=>{},
        once:(event:string, funct:Function)=>{
            console.error("!!!!!!!!")
        },
        eventNames:()=>{}
    }

    constructor(){
        this.actual_event_emitter = new EventEmitter();

    }

    emit=( event_obj:WsEvent )=>{
        return new Promise((resolve, reject)=>{

            if( typeof event_obj!=="object" ){
                const err_str = "event must be an object";
                reject(err_str);
                throw new Error(err_str);
                process.exit(-1);
            }

            //event = sortObject(event); // TODO remove this from others

            if( event_obj["uuid"] ){
                console.warn("event.uuid is defined...I don't think it should ever be");
            }

            const uuid = event_obj["uuid"] || uuid_v4();

            const once_event = {state:"DONE", uuid}; // TODO use interface?
            const once_event_string = JSON.stringify(once_event);
            this.locical_event_emitter.on( once_event_string, ( data )=>{resolve(data);});

            const new_event  = sortObject({ uuid, ...event_obj }); // uuid is first so it will be covered up by event's uuid if it is there
            const event_string = JSON.stringify( event_obj );
            
            this.locical_event_emitter.emit( event_string, new_event  );

            // console.log( event_string );
            console.log( "--event_string--"+event_string );
            console.log( "--once_event_string--"+once_event_string );
        });
    }

    emit_done=( uuid:string ):void=>{

        const event = sortObject({state:"DONE", uuid});
        const event_str = JSON.stringify(event);
        this.locical_event_emitter.emit( event_str, event );

        console.log( "++emit_done++"+event_str );
        
        return event;
    }

    on=( event:EventObj, callback:Function ):Promise<any>=>{

        return new Promise((resolve, reject)=>{

            let event_str;
            if( typeof event==="object" ){
                event = sortObject(event); // TODO remove this from others
                event_str = JSON.stringify(event);
            }else{
                event_str = event;
            }

            this.locical_event_emitter.on( event_str, callback );

            resolve();
        });
    }
}

// let pee = new PendingEventEmitter();

// pee.on( {"t":"t"}, (data)=>{
//     console.log("test recieved");
//     console.log(data);
//     pee.emit_done( data.uuid );
// } )

// pee.emit( {"t":"t"} )
// .then((data)=>{
//     console.log("finaly done");
// });

const pending_event_emitter = new PendingEventEmitter()


export {PendingEventEmitter, pending_event_emitter}