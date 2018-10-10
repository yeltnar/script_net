import {PendingEventEmitter} from "../PendingEventEmitter/PendingEventEmitter"
import {WsEvent, WsEventType, EventObj} from "../../Interfaces/EventInterfaces/WsEvent.interface";

const WebSocket = require("isomorphic-ws"); // TODO test this to see if it works

class ScriptNetWebsocketClient{
    
    protected pending_event_emitter:PendingEventEmitter;

    device_info = {
        "parser_name":"default_parser_name",
        "device_name":"default_device_name",
        "group_name":"default_group_name",
        "parser_token":"default_parser_token"
    };

    // TODO a lot of this needs to be in config
    // other parts need to be better generated 
    constructor( pending_event_emitter:PendingEventEmitter ){

        this.pending_event_emitter = pending_event_emitter;

        let server_url = "127.0.0.1:3000/";

        this.device_info = {
            "parser_name":"parser_name",
            "device_name":"device_name",
            "group_name":"group_name",
            "parser_token":"parser_token"
        };

        const query_params = this.device_info;

        const event_strings = [];
        event_strings.push( JSON.stringify({"event":"e.e.e"}) );
        event_strings.push( JSON.stringify({"event":"e1"}) );
        event_strings.push( JSON.stringify({"event":"e2"}) );
    
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
    
        const connectionObj = {
            protocol:"ws",
            server_url,
            query_params_str
        };

        this.setUpWebsocket( connectionObj, event_strings );
    }

    setUpWebsocket = async( connectionObj:{protocol:string, server_url:string, query_params_str:string}, event_obj_arr:Array<WsEvent> )=>{

        console.log("connecting to "+connectionObj.protocol+"://"+connectionObj.server_url);
        console.log("query_params_str "+connectionObj.query_params_str);

        const ws = new WebSocket(connectionObj.protocol+"://"+connectionObj.server_url+connectionObj.query_params_str);

        ws.on("open", ()=>{

            setTimeout(()=>{
                sendObj({
                    event_obj:{
                        event:"e.e.e",
                        // parser_name:this.device_info.parser_name,
                        // device_name:this.device_info.device_name,
                        // group_name:this.device_info.group_name,
                        // parser_token:this.device_info.parser_token
                    },
                    type:WsEventType.PLAIN
                });
            },3000)

            event_obj_arr.forEach(( event_obj )=>{
                sendObj(event_obj);
            });

        });

        ws.on("message", ( msg:WsEvent )=>{

            console.log("ScriptNEtWebsocketClient connection got message");

            if( typeof msg === "string" ){
                msg = JSON.parse(msg);
            }

            if( msg.type===WsEventType.ADD_EVENT ){

            }else if( msg.type===WsEventType.HTTP ){

            }else if( msg.type===WsEventType.INFO ){

            }else if( msg.type===WsEventType.PLAIN  ){
                
                this.pending_event_emitter.emit( msg );

            }else if( msg.type===undefined ){
                msg.type = WsEventType.PLAIN;
                console.warn("!!!msg.type===undefined!!!");

                this.pending_event_emitter.emit( msg );
            }


            

            console.log(msg);

        })

        ws.on("error", (error)=>{
            console.log("error")
            console.log(error)
        })

        const sendObj=( obj:WsEvent )=>{
            ws.send( JSON.stringify(obj) );
        }
    }

}

export {ScriptNetWebsocketClient};