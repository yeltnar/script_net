const WebSocket = require('ws');
const url = require('url');

class WsServer{

    wss; // instance of web socket server

    constructor( server ){

        this.wsInit( server );
    }

    private wsInit( server  ){

        //const wss = new WebSocket.Server({ server, verifyClient:this.verifyClient });
        const wss = new WebSocket.Server({ server, verifyClient:this.verifyClient });

        this.wss = wss;
    
        wss.on('connection', (ws, request)=>{
            console.log("new connection");

            //ws.
        });
    
        console.log("wsInit done");
    }

    verifyClient=( info, callback )=>{

        console.log("calling verifyClient");

        try{
        
            const queryData = url.parse(info.req.url, true).query
            const {parser_name,device_name,group_name,parser_token} = queryData;
            
            if( parser_name && device_name && group_name && parser_token ){
                // good to go
                console.log("good to go")
                callback(true);
            }else{
                const err_str = "Required field missing";
                console.error(err_str);
                console.error("-----");
                console.error(queryData);
                console.error({parser_name, device_name, group_name, parser_token});
                console.error("-----");
                //throw err_str;
                callback(false, 401, JSON.stringify({parser_name, device_name, group_name, parser_token}))
            }

        }catch(e){
            callback(false, 500, JSON.stringify(e) )
        }

    }
}

export {WsServer};