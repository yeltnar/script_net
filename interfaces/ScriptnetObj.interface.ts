
interface ScriptNetServerObj{
    protocol: "ws" | "wss",
    address:string
}

interface ScriptNetClientObj{
    parser_name:string,
    device_name:string,
    group_name:string,
    parser_token:string
}

export {ScriptNetServerObj,ScriptNetClientObj}