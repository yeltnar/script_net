import sortObject from "../../sortObject"
import {PendingEventEmitter} from "../PendingEventEmitter/PendingEventEmitter"

const express = require('express');

// TODO re think 
// const EventEmitter = require('events');
// const ee = new EventEmitter();

const config = require("config");

class ExpressServer{

    server; // http server from the express app
    app; // instance of express 
    pending_event_emitter:PendingEventEmitter;

    constructor( pending_event_emitter:PendingEventEmitter ){

        this.pending_event_emitter = pending_event_emitter;

        start()
        .then( this.createExpressApp )
        .then( this.addExpressEndpoints )
        .then( this.startExpressListening )
        .catch((e)=>{
            console.error(e);
        });
    }

    protected createExpressApp=async ()=>{

        const port = config.port || 3000;// TODO remove fallback

        if( port===undefined ){
            throw new Error("no port defined");
        }

        this.app = express();
        this.app.set("port", port); // TODO move to config
        this.app.use((req, res, next)=>{
            console.log("request for: '"+req.url+"'");
            next()
        })
        return this.app;
    }

    protected addExpressEndpoints=async ( app )=>{

        const single_regex_string = "(\\w+=.*)";

        const regexCallback=async(req, res)=>{

            const regex_test:RegExp = req.route.path; // TODO make sure this typing is working or find a way to add commented out block 
            
            // if( !regex_test instanceof RegExp ){
            // 	let err = new Error("regexCallback used but not with regex");
            // 	res.status(500).json(err);
            // 	throw err;
            // }
        
            const regex_res_arr = regex_test.exec(req.url) ;
        
            let obj:any = {};
            
            regex_res_arr.forEach((cur, i, arr)=>{
        
                // skip whole string; only want parts
                if(i!==0){
                    const cur_arr = cur.split("=");
        
                    obj[ cur_arr[0] ] = cur_arr[1];
                }
            });

            const {event, parser_name, device_name, group_name, token } = obj

            // plucked obj contains the keys that I want to be part of the event
            let plucked_obj = {event, parser_name, device_name, group_name, token };
            
            plucked_obj = sortObject( plucked_obj );
        
            // TODO wait for reply from emit then resolve it
            this.pending_event_emitter.emit( plucked_obj, obj ).then(()=>{
                this.sendHttpReply( res, obj);
            });
        }
        
        // adds i+1 times _(let i=9 would be 10 times)_
        // this is the max number of variables that can be passed into the url
        for(let i=9; i>=0; i--){
            let r_str = "v1"
        
            for( let j=0; j<i+1; j++ ){
                r_str += "/"+single_regex_string;
            }

            r_str +="\/?(.*)";
        
            const r = new RegExp( r_str );
        
            app.all( r, regexCallback );
        }

        return app;
    }

    protected sendHttpReply=( res, contents )=>{
        if( typeof contents === "object" ){
            res.json(contents);
        }else{
            res.end(contents);
        }
    }

    protected startExpressListening=async( app )=>{
        this.server = app.listen(app.get('port'),()=>{
            console.log("listening on port "+app.get('port'));
        });
    }

}

export default ExpressServer

// start promise for formatting 
async function start(){
    return;
}


/*
// TODO move the next part to another file  
interface FilterObj{
    filter_name:string,
    values:Array<string>
}

class WSConnector {

    protected filter_objects:Array<FilterObj>;
    protected ee; // EventEmitter object
    protected ws; // ws connection 

    // ee - EventEmitter to register onto
    // filter_objects - FilterObj to trigger with
    // ws - websocket connection to send registered events and data to
    constructor( ee, filter_objects, ws ){
        this.ee = ee;
        this.filter_objects = filter_objects;
        this.ws = ws;

        this.addEventListeners( this.filter_objects );
    }

    // TODO def doesn't belong here
    protected addEventListeners=( arr_of_filters, seed_obj={} )=>{

        if( arr_of_filters!==undefined  && arr_of_filters.length>0 ){

            let cur_filter_obj:FilterObj = arr_of_filters.pop();

            cur_filter_obj.values.forEach((cur_filter_value, i, arr)=>{

                if( cur_filter_value!==null && cur_filter_value!==undefined ){
                    seed_obj[ cur_filter_obj.filter_name ] = cur_filter_value;
                }else{
                    delete seed_obj[ cur_filter_obj.filter_name ]; // don't know why it is there but this will remove it if it is 
                }

                // break reference to current objects 
                this.addEventListeners( 
                    JSON.parse(JSON.stringify(arr_of_filters)), 
                    JSON.parse(JSON.stringify(seed_obj)) 
                );
            })

        }else{

            //seed_obj = sortObject(seed_obj);

            ee.on( JSON.stringify(seed_obj), this.transmitToWs );
        }
    }

    // TODO replace with ee class thing
    protected transmitToWs=( data )=>{
        ws.send(data);
    }
}

// function to test a parser
(()=>{
    
    const filter_objects = [
        {
            filter_name:"parser_name",
            values:["ppp", undefined]
        },{
            filter_name:"device_name",
            values:["ddd", undefined]
        },{
            filter_name:"group_name",
            values:["ggg", undefined]
        },{
            filter_name:"event",
            values:["e.e.e"]
        }
    ];

    const ws = {send:function( data ){
        console.log("would be sending to ws");
        console.log("in parser callback");
        console.log(data);
    }};

    new WSConnector(ee, filter_objects, ws);

})();


*/