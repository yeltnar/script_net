import {ExpressServer} from "./ExpressServer.class"
import {WsServer} from "./WsServer.class"

const EventEmitter = require("events");

class ScriptnetServer {

    express_server;
    ws_server:WsServer;

    constructor(){
        const cloud_event_emitter = new EventEmitter();

        this.express_server = new ExpressServer( cloud_event_emitter );

        this.express_server.startPromise.then(()=>{
            const httpServer = this.express_server.getHttpServer()
            this.ws_server = new WsServer(httpServer, cloud_event_emitter);
        });

    }
}

export {ScriptnetServer};