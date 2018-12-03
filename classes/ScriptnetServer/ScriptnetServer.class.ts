import {ExpressServer} from "./ExpressServer.class"
import {WsServer} from "./WsServer.class"

import {ScriptEventEmitter, uuid_v4} from "./../ScriptEventEmitter.class"
import {ScriptNetServerObj,ScriptNetClientObj} from "../../interfaces/ScriptnetObj.interface"

import {HttpReturn} from "../ScriptEventEmitter.class"

const EventEmitter = require("events");

import {EventStrings, AddExpressEndpointContainer, WsEventType, CloudEventContainer, ExpressReplyContainer, EventContainer, RemoveExpressRouterContainer} from "../../interfaces/script_loader.interface"

const config = require("config");
const local_config = config.util.loadFileConfigs(__dirname+"/../../config/ScriptnetServer.class"); // this needs to be relative to run directory 

const {
    REQ_KEEP_ARR, 
    local_address, 
    remote_address, 
    script_name, 
    device_name, 
    group_name, 
    parser_token, 
    local_protocol, 
    remote_protocol
} = local_config;

const protocol = process.env.BLUEMIX_REGION===undefined ? local_protocol : remote_protocol; // I think this should stay at local host, // TODO fix this and use config
const address = process.env.BLUEMIX_REGION===undefined ? local_address : remote_address; // I think this should stay at local host

class ScriptnetServer {

    express_server:ExpressServer;
    ws_server:WsServer;
    cloud_event_emitter = new EventEmitter();
    script_event_emitter:ScriptEventEmitter;

    script_net_ws_server_obj:ScriptNetServerObj = {
        protocol,
        address
    };
    script_net_ws_client_obj:ScriptNetClientObj = {
        script_name,
        device_name,
        group_name,
        parser_token, // TODO fix
        connection_id:uuid_v4()
    };

    constructor( doneCallback? ){

        this.express_server = new ExpressServer( this.cloud_event_emitter );

        //TODO remove
        this.express_server.startPromise.then(()=>{

            // need to know the router and ws refrence to add and remove
            //throw "need to know the router and ws refrence to add and remove"
            // this.cloud_event_emitter.on( EventStrings.ADD_EXPRESS_ENDPOINT, this.addExpressEndpoint);
            // process.exit(0);
        })

        this.express_server.startPromise.then(()=>{
            console.log("express server started");
            const httpServer = this.express_server.getHttpServer()
            console.log("making new ws server");
            this.ws_server = new WsServer(httpServer, this.cloud_event_emitter, this.express_server.app);
            console.log("after make new ws server");
            this.ws_server.wss.on("listening", ()=>{
                console.log("ws server started")
                this.connectToWsServer();
                if( doneCallback!==undefined ){
                    doneCallback();
                }
            })
        });
    }

    connectToWsServer=()=>{

        const doneCallback = ( script_event_emitter )=>{
            console.log("connectToWsServer...")

            // script_event_emitter.getWsClient().on("error", ()=>{
            //     console.log("ws_client.on error");
            // })

            console.log("connectToWsServer - open ")

            //throw "need to know the router and ws refrence to add and remove"
            //script_event_emitter.registered_cloud_events
            script_event_emitter.addRegisteredEvent({
                cloud_event_string:EventStrings.ADD_EXPRESS_ENDPOINT,
                required_keys_table:null,
                script_event_string:EventStrings.ADD_EXPRESS_ENDPOINT,
            });
            
            script_event_emitter.addRegisteredEvent({
                cloud_event_string:EventStrings.REMOVE_EXPRESS_ENDPOINT,
                required_keys_table:null,
                script_event_string:EventStrings.REMOVE_EXPRESS_ENDPOINT,
            });

            script_event_emitter.on( EventStrings.ADD_EXPRESS_ENDPOINT, this.addExpressEndpoint);
            script_event_emitter.on( EventStrings.REMOVE_EXPRESS_ENDPOINT, this.removeExpressRouter);

            this.ws_server.express_set_up = true;

            console.log("sent AddExpressEndpointContainer");

        }

        this.script_event_emitter = new ScriptEventEmitter( this.script_net_ws_server_obj, this.script_net_ws_client_obj, doneCallback);
    }

    addExpressEndpoint=( data:AddExpressEndpointContainer )=>{

        console.log("addExpressEndpoint")
        console.log(data)

        data = typeof data==="string" ? JSON.parse(data) : data; // make sure we have AddExpressEndpointContainer

        let {router_name, express_string, cloud_event_string, http_method, allow_keep_router_name} = data.event.data;

        const default_router_name:string = data.sender_device_meta_data.connection_id + data.sender_device_meta_data.script_name + data.sender_device_meta_data.device_name + data.sender_device_meta_data.group_name;

        router_name = allow_keep_router_name===true ? router_name : default_router_name;

        const router = this.express_server.getRouter( router_name );

        const express_string_arr = [express_string, "/"+data.sender_device_meta_data.device_name+express_string];

        if( http_method==="GET" ){

            router.get( express_string_arr, this.initExpressCallback(cloud_event_string) );
            console.log("GET");
            console.log(express_string_arr);

        }else if( http_method==="POST" ){

            router.post( express_string_arr, this.initExpressCallback(cloud_event_string) );
            console.log("POST");
            console.log(cloud_event_string);

        }else if( http_method==="DELETE" ){

            router.delete( express_string_arr, this.initExpressCallback(cloud_event_string) );
            console.log("DELETE");
            console.log(express_string_arr);

        }else if( http_method==="ALL" ){

            router.all( express_string_arr, this.initExpressCallback(cloud_event_string) );
            console.log("ALL");
            console.log(express_string_arr);

        }
    }

    removeExpressRouter=( data:RemoveExpressRouterContainer )=>{

        const {router_name} = data.event.data;

        this.express_server.removeRouter( router_name );
    }

    initExpressCallback=( cloud_event_string:EventStrings )=>{

        // this is the express endpoint callback
        return ( req, res )=>{
            //res.end(cloud_event_string);
            req = this.pullOutRequestData(req);

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

                const http_return:HttpReturn = event_container.event.data;

                // if have all HttpReturn fields...
                if( http_return.status !== undefined && http_return.msg !== undefined && http_return.type !== undefined && http_return.msg_only !== undefined ){

                    if( http_return.msg_only!==true ){

                        res.json( event_container );

                    }else{
                        const msg = typeof http_return.msg==="string" ? http_return.msg : JSON.stringify(http_return.msg);

                        res.type( http_return.type );
                        res.status( http_return.status ).end( msg )
                    }


                }else{
                    res.json( event_container );
                }
                
            });
        };

    }

    pullOutRequestData=( req )=>{

        const filtered_req = {};

        REQ_KEEP_ARR.forEach((cur, i, arr)=>{
            filtered_req[cur] = req[cur];
        });

        return filtered_req;
    }
}

export {ScriptnetServer};