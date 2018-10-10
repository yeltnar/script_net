import backbone from "./backbone"

const express_server_startPromise = backbone.express_server_startPromise;
const pending_event_emitter = backbone.pending_event_emitter;


// process.on('unhandledRejection', (reason, promise) => {
//     console.log();
//     console.error(reason)
// });

// TODO remove after this... its for testing 

// pending_event_emitter.on( {event:"e.e.e"}, (data)=>{
//     console.log("test event received | data: "+JSON.stringify(data))
//     //console.log("test event received | data: "+JSON.stringify(data,null,2))
    
//     if( data.uuid ){
//         pending_event_emitter.emit_done( data.uuid );
//         console.log("resolved "+data.uuid);
//     }else{
//         console.error("ERROR: data is "+JSON.stringify(data));
//         console.error("ERROR: data.uuid is "+data.uuid);
//     }
    
// });

express_server_startPromise.then(()=>{

    let server_url = "127.0.0.1:3000/";

    let query_params = {
        "parser_name":"parser_name",
        "device_name":"device_name",
        "group_name":"group_name",
        "parser_token":"parser_token",
        "event_strings":JSON.stringify([
            {"event":"e.e.e"},
            {"event":"e1"},
            {"event":"e2"}
        ])
    }

    let first = true;
    let query_params_str = "";
    for( let k in query_params ){

        if( first ){
            query_params_str += "?";
        }else{
            query_params_str += "&";
        }

        query_params_str += k+"="+query_params[k];

        first = false;
    }

    server_url += query_params_str;

    const connectionObj = {
        protocol:"ws",
        server_url
    };


    // TODO replace this with wrapper that includes event emitter
    const WebSocket = require("isomorphic-ws"); // TODO test this to see if it works

    console.log("connecting to "+connectionObj.protocol+"://"+connectionObj.server_url);
    const ws = new WebSocket(connectionObj.protocol+"://"+connectionObj.server_url)

    ws.on("open", ()=>{

        setTimeout(()=>{
            const json = JSON.stringify( {event:"e.e.e"} );
            ws.send( json );
        },3000)

    });

    ws.on("message", (msg)=>{

        console.log("test connection got message");

        if( typeof msg === "string" ){
            msg = JSON.parse(msg);
        }

        console.log(msg);

    })

    ws.on("error", (error)=>{
        console.log("error")
        console.log(error)
    })

})
