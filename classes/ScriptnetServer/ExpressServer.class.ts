const express = require("express");

class ExpressServer{

    startPromise;
    app;
    port;
    server;

    sub_route_str = "/v1";

    constructor(){

        this.startPromise = new Promise((resolve, reject)=>{
            start()
            .then( this.createExpressApp )
            .then( this.construct_createExpressRouter(this.sub_route_str) )

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

        this.startPromise.then(()=>{
            this.app.all("*",(req:any, res:any)=>{
                res.status(400).json({err:"no endpoint triggered"})
            });
        })
        
    }

    private createExpressApp=async ()=>{

        const port = this.port || 3000;// TODO remove fallback

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