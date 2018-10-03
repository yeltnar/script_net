import ExpressServer from "./express_server/express_server"
import WsServer from "./websocket_server/websocket_server"
import PendingEventEmitter from "./PendingEventEmitter/PendingEventEmitter"

const pending_event_emitter = new PendingEventEmitter();

const express_server = new ExpressServer( pending_event_emitter );
const ws_server =  new WsServer(pending_event_emitter, express_server.server);