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
    
            console.log("new ws connection")
    
            ws.isAlive = true;

            const queryData = url.parse(request.url, true).query
            const {parser_name,device_name,group_name} = queryData;
            const event_strings = JSON.parse(queryData.event_strings);
            
            ws.script_net = {
                parser_name,
                device_name,
                group_name,
                event_strings
            };

            this.setUpWsClient( ws );

            console.log("ws.script_net");
            console.log(ws.script_net);
    
            ws.on("message", (msg:WsEvent)=>{

                if( typeof msg==="string" ){
                    msg = JSON.parse(msg);
                }

                if( checkRequiredFields(msg) ){

                    msg = sortObject(msg);

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
                        this.pending_event_emitter.emit( msg.event_obj, msg.data );
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
        });
    
        console.log("wsInit done");
    }

    private verifyClient=( info, callback:Function )=>{

        try{
        
            const queryData = url.parse(info.req.url, true).query
            const {parser_name,device_name,group_name,event_strings,parser_token} = queryData;
            
            if( parser_name && device_name && group_name && event_strings && parser_token ){
                // good to go
                console.log("good to go")
                callback(true);
            }else{
                throw "Required field missing";
            }

        }catch(e){
            callback(false, 500, JSON.stringify(e) )
        }
        
    }

    protected setUpWsClient=( ws_client )=>{

        ws_client.script_net.event_strings.forEach((cur, i, arr)=>{

            if( typeof cur==="object" ){
                cur = JSON.stringify(cur);
            }

            console.log("--adding--'"+cur+"' "+typeof cur);
            
            this.pending_event_emitter.on(cur, (data)=>{

                // if( typeof data==="object" ){
                //     data = JSON.stringify(data);
                // }

                console.log("forwarding to client");

                ws_client.send( { event_string:cur, data } );
            }); 

        });
    }
}

function checkRequiredFields( obj:any ){
    return true;
}

export default WsServer;