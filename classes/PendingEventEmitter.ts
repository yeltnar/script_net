const EventEmitter = require("events");
const uuid_v4 = require('uuid/v4');

import sortObject from "../sortObject"

class PendingEventEmitter{

    // instance of EventEmitter these are stubs so ts knows what can be done
    private event_emitter={ 
        emit:(event:string, data:any)=>{},
        on:(event:string, funct:Function)=>{},
        once:(event:string, funct:Function)=>{
            console.error("!!!!!!!!")
        },
        eventNames:()=>{},

    }; 

    constructor(){
        this.event_emitter = new EventEmitter();

    }

    public emit( event_obj, data ){

        throw new Error("emit not ready...event_obj type removed");

        console.log( "this.event_emitter.eventNames()" );
        console.log( this.event_emitter.eventNames() );

        if( data===undefined ){
            console.error(new Error("data must be defined or null"));
        }

        return new Promise((resolve, reject)=>{

            console.log("PendingEventEmitter broadcast");
            console.log( "Object.keys(event_obj)" );
            console.log( Object.keys(event_obj) );

            if( Object.keys(event_obj).indexOf( "event_obj" ) >= 0 ){
                console.error(new Error("event_obj is a WsEvent"))
            }

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
            this.event_emitter.on( once_event_string, ( data )=>{resolve(data);});

            const new_event  = sortObject({ uuid, ...event_obj }); // uuid is first so it will be covered up by event's uuid if it is there
            const event_string = JSON.stringify( event_obj );
            
            this.event_emitter.emit( event_string, new_event  );

            // console.log( event_string );
            console.log( "--event_string received--"+event_string );
            console.log( "--once_event_string registering--"+once_event_string );
        });
    }

    emit_done=( uuid:string, event_str:string ):void=>{

        throw new Error("emit_done not ready");
    }

    on=( event, callback:Function )=>{
        this.event_emitter.on( event, callback );
    }
}

const pending_event_emitter = new PendingEventEmitter()


export {PendingEventEmitter, pending_event_emitter}