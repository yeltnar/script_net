import sortObject from "../../sortObject";
import PendingEventEmitter from "../PendingEventEmitter/PendingEventEmitter"

const WebSocket = require('ws');
const http = require("http");

class WsServer{

    wss; // instance of web socket server
    pending_event_emitter;

    constructor( pending_event_emitter:PendingEventEmitter, server? ){

        this.pending_event_emitter = pending_event_emitter;
        
        server = server || this.createHttpServer();
    }

    createHttpServer=()=>{

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

    private wsInit( server, ws_server_config  ){

        const wss = new WebSocket.Server({ server });

        this.wss = wss;
    
        wss.on('connection', (ws, req)=>{
    
            console.log("new connection")
    
            ws.isAlive = true;
    
            ws.on("message", (msg)=>{
                if( checkRequiredFields(msg) ){
                    msg = sortObject(msg);
                    ee.emit( JSON.stringify(msg) );
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
        });
    
        console.log("wsInit done")
        return {sendToSockets};
    }
}

export default WsServer;