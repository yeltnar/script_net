import sortObject from "../../sortObject";
import {PendingEventEmitter} from "../../lib/PendingEventEmitter/PendingEventEmitter"
import {WsEvent, WsEventType, EventObj, WsAddEvent}  from "../../Interfaces/EventInterfaces/WsEvent.interface";

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const pingInterval = 1000*60;// 1 min // TODO move

class WsServer{

    wss; // instance of web socket server
    pending_event_emitter:PendingEventEmitter;

    constructor( pending_event_emitter:PendingEventEmitter, server? ){

        this.pending_event_emitter = pending_event_emitter;
        
        server = server || this.createFallbackHttpServer();

        this.wsInit( server );
    }

    createFallbackHttpServer=()=>{

        const server = http.createServer(function(request, response) {
            console.log((new Date()) + ' Received request for ' + request.url);
            response.writeHead(404);
            response.end();
        });
        server.listen(8080, function() {
            console.log((new Date()) + ' Server is listening on port 8080');
        });

        return server;
    }

    private wsInit( server  ){

        //const wss = new WebSocket.Server({ server, verifyClient:this.verifyClient });
        const wss = new WebSocket.Server({ server, verifyClient:this.verifyClient });

        this.wss = wss;
    
        wss.on('connection', (ws, request)=>{

            try{
    
                console.log("new ws connection")
                console.log("0")
        
                ws.isAlive = true;

                console.log("1")

                const queryData = url.parse(request.url, true).query
                const {parser_name,device_name,group_name} = queryData;
                console.log("3")
                console.log("queryData")
                console.log(typeof queryData)
                console.log(queryData)
                const event_obj_list = JSON.parse(queryData.event_obj_list);
                //const event_obj_list = queryData.event_obj_list;
        
                console.log("2")
                
                ws.script_net = {
                    parser_name,
                    device_name,
                    group_name,
                    event_obj_list
                };

                console.log(typeof ws.script_net.event_obj_list);
                console.log(ws.script_net.event_obj_list);

                ws.script_net.event_obj_list.forEach((cur_ws_event_obj:EventObj, i, arr)=>{
                    // TODO this needs to be generated based on combinations of optional params
        
                    // console.log("--adding Object.keys(cur)--'"+Object.keys(cur_ws_event.event_obj));
        
                    // console.log("--adding--'"+JSON.stringify(cur_ws_event)+"' "+typeof cur_ws_event);
                    
                    console.log("--adding cur_ws_event.event_obj...-- `"+JSON.stringify(cur_ws_event_obj)+"`")
                    // console.log("--adding cur_ws_event...--"+JSON.stringify(cur_ws_event))
                    
                    this.pending_event_emitter.on(cur_ws_event_obj, (data)=>{
        
                        // if( typeof data==="object" ){
                        //     data = JSON.stringify(data);
                        // }
        
                        console.log("forwarding event client requested to client");

                        sendObj({ 
                            event_obj: cur_ws_event_obj, 
                            type:WsEventType.PLAIN, // TODO make more than plain 
                            data 
                        });
                    }); 
        
                });

                console.log("ws.script_net");
                console.log(ws.script_net);
        
                ws.on("message", (msg:WsEvent)=>{

                    console.log("msg")
                    console.log(msg)

                    if( typeof msg==="string" ){
                        msg = JSON.parse(msg);
                    }

                    console.log(`checkRequiredFields(msg) ${checkRequiredFields(msg)}`)
                    if( checkRequiredFields(msg) ){

                        msg = sortObject(msg);

                        console.log("processing msg.type of "+msg.type)

                        if( msg.type === WsEventType.ADD_EVENT ){

                            const add_msg = msg as WsAddEvent;

                            if( add_msg.data.event_obj ){ // TODO check event_obj is actually an instance of EventObj

                                const event_obj:EventObj = add_msg.data.event_obj;
                                const type:WsEventType = add_msg.data.event_type || WsEventType.PLAIN;
                            
                                this.pending_event_emitter.on( event_obj, (data)=>{

                                    const eventMsgObj:WsEvent = {
                                        event_obj,
                                        type,
                                        data,
                                    };

                                    sendObj( eventMsgObj );
                                });
                                
                            }else{
                                throw new Error("msg.data.event_obj not defined // TODO send error to emitter");
                            }

                        }else if( msg.type === WsEventType.HTTP ){

                        }else if( msg.type === WsEventType.INFO ){

                        }else if( msg.type === WsEventType.PLAIN ){
                            console.log("start broadcasting to clients")
                            this.pending_event_emitter.emit( msg.event_obj, null );
                            console.log("done broadcasting to clients")
                        }
                    }
                })
        
                let pingInterval_id = setInterval(()=>{
                    
                    if (ws.isAlive === false) {
        
                        clearInterval(pingInterval_id);
                        ws.terminate();
        
                    }else{
                        
                        ws.isAlive = false;
                        let o = {
                            "ws_server_ping":true,
                            "errors":{}, // put app the error happened in
                            "date":new Date()
                        };
        
                        ws.ping(JSON.stringify(o));
                    }
                    
                },pingInterval)
        
                ws.on('pong', ()=>{ws.isAlive = true});
        
                ws.on('close', ()=>{
                    clearInterval(pingInterval_id);
                    console.log(ws.device_name+' disconnected');
                });

                const sendObj=( obj:WsEvent )=>{
                    ws.send( JSON.stringify(obj) );
                }

            }catch(e){
                console.error(e);
            }
        });
    
        console.log("wsInit done");
    }

    private verifyClient=( info, callback:Function )=>{

        console.log("calling verifyClient");

        try{
        
            const queryData = url.parse(info.req.url, true).query
            const {parser_name,device_name,group_name,event_obj_list,parser_token} = queryData;
            
            if( parser_name && device_name && group_name && event_obj_list && parser_token ){
                // good to go
                console.log("good to go")
                callback(true);
            }else{
                const err_str = "Required field missing";
                console.error(err_str);
                console.error("-----");
                console.error(queryData);
                console.error({parser_name, device_name, group_name, event_obj_list, parser_token});
                console.error("-----");
                //throw err_str;
                callback(false, 401, JSON.stringify({parser_name, device_name, group_name, event_obj_list, parser_token}))
            }

        }catch(e){
            callback(false, 500, JSON.stringify(e) )
        }
        
    }

    protected setUpWsClient=( ws_client )=>{

        
    }
}

function checkRequiredFields( obj:any ){
    return true;
}

export default WsServer;