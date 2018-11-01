// start of server code
import {ScriptnetServer} from "./classes/ScriptnetServer/ScriptnetServer.class"
const fs = require('fs');

const backup_console = {};
Object.keys( console ).forEach((cur)=>{
    backup_console[cur] = console[cur];

    console[cur] = ( ...arr )=>{
        backup_console[cur]( ...arr );
        fs.appendFileSync('message.txt', arr[0]+"\n");
    }
})

const scriptnet_server = new ScriptnetServer();