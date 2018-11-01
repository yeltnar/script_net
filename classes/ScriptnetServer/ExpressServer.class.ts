const express = require("express");
const fs = require('fs');

import {CloudEventContainer, checkCloudEventContainer, WsEventType, AddEventContainer, EventStrings, AddExpressEndpointContainer} from "../../interfaces/script_loader.interface"
import { resolve } from "path";

class ExpressServer{

    startPromise;
    app;
    port;
    server;
    router_obj = {};

    sub_route_str = "/v1";

    constructor(cloud_event_emitter){

        this.startPromise = new Promise((resolve, reject)=>{
            start()
            .then( this.createExpressApp )
            //.then( this.construct_createExpressRouter(this.sub_route_str) )

            //.then( this.addExpressRegexEndpoints )
            //.then( this.addExpressFallbackEndpoint ) // This must be last for routes

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

        // cloud_event_emitter.on( EventStrings.ADD_EXPRESS_ENDPOINT, ()=>{
        //     console.log("EventStrings.ADD_EXPRESS_ENDPOINT in express file");
        // });

        // cloud_event_emitter.on( EventStrings.REMOVE_EXPRESS_ENDPOINT, ()=>{
        //     console.log("EventStrings.REMOVE_EXPRESS_ENDPOINT in express file");
        // });

        this.startPromise.then(()=>{
            // this.app.all("*",(req:any, res:any)=>{
            //     res.status(400).json({err:"no endpoint triggered"})
            // });

            this.app.get("/awake", (req, res, next)=>{
                res.end("200 "+JSON.stringify(process.env)+" "+process.env.PORT+" end ")
            });

            this.app.get("/log", (req, res, next)=>{
                //res.sendFile( "./message.txt" );
                let dir = process.argv[1]
                dir = dir.split( "scriptnet_server.ts" )[0];
                dir = dir+"message.txt";
                console.log( dir )
                res.sendFile( dir );
            });

            this.app.get("/clear_log", (req, res, next)=>{
                fs.writeFileSync("./message.txt", "");
                res.end("cleared")
            });

            console.log("added awake route");


        })
        
    }

    private createExpressApp=async ()=>{

        const port = process.argv[2] || process.env.PORT || 3000;

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

    private construct_createExpressRouter=(sub_route:any)=>{

        const createExpressRouter=async(app:any)=>{

            const router = express.Router();
    
            app.use(sub_route, router);
            console.log("created sub router-'"+sub_route+"'");
    
            return router;
        }

        return createExpressRouter;
    }

    getExpressApp=()=>{
        return this.app;
    }

    getHttpServer=()=>{
        return this.server
    }

    addRouter=( router_name )=>{

        let router = new express.Router();
        this.router_obj[ router_name ] = router;
        this.app.use(router);

        console.log("add router "+router_name)

        return router;
    }

    getRouter=( router_name )=>{

        let router = this.router_obj[ router_name ];

        let found;

        if( router===undefined ){
            router = this.addRouter( router_name );
        }



        // router.all("/test",(req, res)=>{
        //     res.end("test");
        // })

        return router;
    }

    removeRouter=( router_name )=>{

        console.log()
        console.log()
        console.log("deleting "+router_name)
        console.log()

        const router = this.router_obj[ router_name ];

        if( router!==undefined ){

            delete this.router_obj[ router_name ];

            const found_router_index = this.app._router.stack.findIndex(( cur )=>{
                return cur.handle === router;
            });
        
            if( found_router_index>=0 ){
                
                console.log(found_router_index)
        
                this.app._router.stack.splice(found_router_index, 1);
            }
        }

    }

    private startExpressListening=async( app:any )=>{
        app = this.app
        this.server = app.listen(app.get('port'),()=>{
            console.log("listening on port "+app.get('port'));
        });
    }

}

export {ExpressServer};

// start promise for formatting 
async function start(){
    return;
}