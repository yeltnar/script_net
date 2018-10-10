import sortObject from "../../sortObject";
import {PendingEventEmitter} from "../../lib/PendingEventEmitter/PendingEventEmitter";

const express = require('express');

// TODO re think 
// const EventEmitter = require('events');
// const ee = new EventEmitter();

const config = require("config");

class ExpressServer{

    server:any; // http server from the express app
    app:any; // instance of express 
    pending_event_emitter:PendingEventEmitter;

    sub_route:string;

    startPromise:Promise<void>;

    constructor( pending_event_emitter:PendingEventEmitter ){

        this.pending_event_emitter = pending_event_emitter;

        this.sub_route = "/v1";

        this.startPromise = new Promise((resolve, reject)=>{
            start()
            .then( this.createExpressApp )
            .then( this.construct_createExpressRouter(this.sub_route) )

            .then( this.addExpressRegexEndpoints )
            .then( this.addExpressFallbackEndpoint ) // This must be last for routes

            .then( this.getExpressApp ) 
            .then( this.startExpressListening )
            .then(()=>{
                resolve();
            })
            .catch((e)=>{
                console.error(e);
                reject();
            });
        });

        this.startPromise.then(()=>{
            this.app.all("*",(req:any, res:any)=>{
                res.status(400).json({err:"no endpoint triggered"})
            });
        })
        
    }

    protected createExpressApp=async ()=>{

        const port = config.port || 3000;// TODO remove fallback

        if( port===undefined ){
            throw new Error("no port defined");
        }

        this.app = express();
        this.app.set("port", port); // TODO move to config
        this.app.use((req:any, res:any, next:any)=>{
            console.log("request for: '"+req.url+"'");
            next();
        })
        return this.app;
    }

    protected construct_createExpressRouter=(sub_route:any)=>{

        const createExpressRouter=async(app:any)=>{

            const router = express.Router();
    
            app.use(sub_route, router);
            console.log("created sub router-'"+sub_route+"'");
    
            return router;
        }

        return createExpressRouter;
    }

    protected addExpressRegexEndpoints=async ( incoming_router:any )=>{

        const router = express.Router();

        const single_regex_string = "(\\w+=.*)";

        const regexCallback=async(req:any, res:any)=>{

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

            const {event, parser_name, device_name, group_name, token, server_token, status, uuid } = obj

            // plucked obj contains the keys that I want to be part of the event
            let plucked_obj = {event, parser_name, device_name, group_name, token, status };


            // TODO actually check server_token 
            if( server_token!==undefined && this.checkServerToken(server_token) ){

                // assume trying to resolve pending request
                if( uuid!==undefined ){

                    console.log("GOT UUID IN EXPRESS REQUEST");

                    let done_obj = this.pending_event_emitter.emit_done( uuid );
                    this.sendHttpReply( res, done_obj );

                }else{
                    console.log("!!!")
                
                    plucked_obj =  sortObject( plucked_obj );
                
                    // TODO wait for reply from emit then resolve it
                    this.pending_event_emitter.emit( plucked_obj, obj ).then(()=>{
                        this.sendHttpReply( res, obj );
                    });
                }

            }else{

                const options = {
                    status:401
                };
                
                // didn't check out
                const err = "server token didn't check out";

                console.log({err});
                this.sendHttpReply( res, {err}, options);
            }
            
        }
        
        // adds i+1 times _(let i=9 would be 10 times)_
        // this is the max number of variables that can be passed into the url
        for(let i=100; i>=0; i--){
            let r_str = ""
        
            for( let j=0; j<i+1; j++ ){
                r_str += "/"+single_regex_string;
            }

            //r_str +="\/?(.*)";
        
            const r = new RegExp( r_str );
        
            router.all( r, regexCallback );
            //console.log("r_str /ee"+r_str)
        }

        //app.use(router);
        incoming_router.use("/ee", router);

        // app.use("/ee/*", (req, res)=>{
        //     res.end("ee")
        // })

        return incoming_router;
    }

    protected addExpressFallbackEndpoint=async ( incoming_router:any )=>{
        incoming_router.all((req:any, res:any)=>{
            res.status(500).json({err:"no route found"});
        });
        return incoming_router;
    }

    protected startExpressListening=async( app:any )=>{
        app = this.app
        this.server = app.listen(app.get('port'),()=>{
            console.log("listening on port "+app.get('port'));
        });
    }

    protected getExpressApp=()=>{
        return this.app;
    }

    protected sendHttpReply=( res:any, contents:any, options?:{ status?:number } )=>{

        if( options!==undefined ){
            if( options.status ){
                res.status(options.status);
            }
        }

        if( typeof contents === "object" ){
            res.json(contents);
        }else{
            res.end(contents);
        }
    }

    protected checkServerToken=( incoming_token:string ):boolean=>{
        // TODO fix this function 
        console.log("not checking token "+incoming_token);
        return true;
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