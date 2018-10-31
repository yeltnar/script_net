import {ExpressServer} from "./ExpressServer.class"
import {WsServer} from "./WsServer.class"

import {ScriptEventEmitter, uuid_v4} from "./../ScriptEventEmitter.class"
import {ScriptNetServerObj,ScriptNetClientObj} from "../../interfaces/ScriptnetObj.interface"

const EventEmitter = require("events");

import {EventStrings, AddExpressEndpointContainer, WsEventType, CloudEventContainer, ExpressReplyContainer, EventContainer, RemoveExpressRouterContainer} from "../../interfaces/script_loader.interface"

class ScriptnetServer {

    express_server:ExpressServer;
    ws_server:WsServer;
    cloud_event_emitter = new EventEmitter();
    script_event_emitter:ScriptEventEmitter;

    script_net_ws_server_obj:ScriptNetServerObj = {
        protocol: "ws", // TODO fix this and use config
        address:"127.0.0.1:3000" // I think this should stay at local host
    };
    script_net_ws_client_obj:ScriptNetClientObj = {
        parser_name:"cloud_express_server",
        device_name:"bluemix",
        group_name:"bluemix",
        parser_token:"bluemix"// TODO fix
    };

    constructor( doneCallback ){

        this.express_server = new ExpressServer( this.cloud_event_emitter );

        //TODO remove
        this.express_server.startPromise.then(()=>{

            // need to know the router and ws refrence to add and remove
            //throw "need to know the router and ws refrence to add and remove"
            // this.cloud_event_emitter.on( EventStrings.ADD_EXPRESS_ENDPOINT, this.addExpressEndpoint);
            // process.exit(0);
        })

        this.express_server.startPromise.then(()=>{
            const httpServer = this.express_server.getHttpServer()
            this.ws_server = new WsServer(httpServer, this.cloud_event_emitter, this.express_server.app);
            this.ws_server.wss.on("listening", ()=>{
                this.connectToWsServer();
                doneCallback();
            })
        });
    }

    connectToWsServer=()=>{
        this.script_event_emitter = new ScriptEventEmitter( this.script_net_ws_server_obj, this.script_net_ws_client_obj);

        console.log("connectToWsServer...")

        this.script_event_emitter.ws_client.on("error", ()=>{
            console.log("error");
        })

        this.script_event_emitter.ws_client.on("open", ()=>{

            console.log("connectToWsServer - open ")

            //throw "need to know the router and ws refrence to add and remove"
            //this.script_event_emitter.registered_cloud_events
            this.script_event_emitter.addRegisteredEvent({
                cloud_event_string:EventStrings.ADD_EXPRESS_ENDPOINT,
                required_keys_table:null,
                script_event_string:EventStrings.ADD_EXPRESS_ENDPOINT,
            });

            this.script_event_emitter.addRegisteredEvent({
                cloud_event_string:EventStrings.REMOVE_EXPRESS_ENDPOINT,
                required_keys_table:null,
                script_event_string:EventStrings.REMOVE_EXPRESS_ENDPOINT,
            });

            this.script_event_emitter.on( EventStrings.ADD_EXPRESS_ENDPOINT, this.addExpressEndpoint);
            this.script_event_emitter.on( EventStrings.REMOVE_EXPRESS_ENDPOINT, this.removeExpressRouter);

            console.log("sent AddExpressEndpointContainer");
        })

    }

    addExpressEndpoint=( data:AddExpressEndpointContainer )=>{

        console.log("addExpressEndpoint")
        console.log(data)

        data = typeof data==="string" ? JSON.parse(data) : data; // make sure we have AddExpressEndpointContainer

        let {router_name, express_string, cloud_event_string, http_method, allow_keep_router_name} = data.event.data;

        const default_router_name:string = data.sender_device_meta_data.script_name + data.sender_device_meta_data.device_name + data.sender_device_meta_data.group_name;

        router_name = allow_keep_router_name===true ? router_name : default_router_name;

        const router = this.express_server.getRouter( router_name );

        let routerFunction;

        if( http_method==="GET" ){

            router.get( express_string, this.initExpressCallback(cloud_event_string) );
            console.log("GET");
            console.log(cloud_event_string);

        }else if( http_method==="POST" ){

            router.post( express_string, this.initExpressCallback(cloud_event_string) );
            console.log("POST");
            console.log(cloud_event_string);

        }else if( http_method==="DELETE" ){

            router.delete( express_string, this.initExpressCallback(cloud_event_string) );
            console.log("DELETE");
            console.log(cloud_event_string);

        }else if( http_method==="ALL" ){

            router.all( express_string, this.initExpressCallback(cloud_event_string) );
            console.log("ALL");
            console.log(cloud_event_string);

        }
    }

    removeExpressRouter=( data:RemoveExpressRouterContainer )=>{

        const {router_name} = data.event.data;

        this.express_server.removeRouter( router_name );
    }

    initExpressCallback=( cloud_event_string:string )=>{

        // this is the express endpoint callback
        return ( req, res )=>{
            //res.end(cloud_event_string);
            req = this.pullOutRequestData(req);
            req = ":shrug:";

            // const cloud_event_container:ExpressReplyContainer = {
            //     event:{
            //         event_type:WsEventType.DONE,
            //         uuid:uuid_v4(),
            //         data:req
            //     },
            //     device_meta_data:{},
            //     event_name: cloud_event_string,
            // };

            const cloud_event_container:CloudEventContainer = {
                device_meta_data:{},
                event_name:cloud_event_string,
                event:{
                    event_type:WsEventType.HTTP,
                    uuid:uuid_v4(),
                    data:req
                }
            }

            this.script_event_emitter.emitToCloudPromise( cloud_event_container ).then(( event_container:EventContainer )=>{
                res.json( event_container );
            });
        };

    }

    pullOutRequestData=( req )=>{
        return req;
    }
}

export {ScriptnetServer};