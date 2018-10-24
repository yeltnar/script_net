import {ExpressServer} from "./ExpressServer.class"
import {WsServer} from "./WsServer.class"

class ScriptnetServer {

    express_server;
    ws_server;

    constructor(){
        this.express_server = new ExpressServer();

        this.express_server.startPromise.then(()=>{
            const httpServer = this.express_server.getHttpServer()
            this.ws_server = new WsServer(httpServer);
        });

    }
}

export {ScriptnetServer};