import ExpressServer from "./express_server/express_server"
import WsServer from "./websocket_server/websocket_server"
import {PendingEventEmitter, pending_event_emitter} from "../lib/PendingEventEmitter/PendingEventEmitter"

const config = require("config");

const express_server = new ExpressServer( pending_event_emitter );
let ws_server;
express_server.startPromise.then(()=>{
    ws_server =  new WsServer(pending_event_emitter, express_server.server);
})

export default {
    express_server_startPromise: express_server.startPromise,
    pending_event_emitter
};