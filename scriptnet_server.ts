// start of server code
import {ScriptnetServer} from "./classes/ScriptnetServer/ScriptnetServer.class"
const fs = require('fs');

//imports for script nodes... these need to be surrounded with a try catch  
import start_notify from "./script_nodes/notification/notify";

const backup_console = {};
Object.keys( console ).forEach((cur)=>{
    backup_console[cur] = console[cur];

    console[cur] = ( ...arr )=>{
        backup_console[cur]( ...arr );
        fs.appendFileSync('message.txt', JSON.stringify(arr[0])+"\n");
    }
})

const scriptnet_server = new ScriptnetServer( doneCallback );

function doneCallback(){
    // setTimeout(()=>{ // make sure its actually up
    //     start_notify();
    // },3000);
}