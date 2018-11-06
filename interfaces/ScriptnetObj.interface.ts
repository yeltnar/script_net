
interface ScriptNetServerObj{
    protocol: "ws" | "wss",
    address:string
}

interface ScriptNetClientObj{
    script_name:string,
    device_name:string,
    group_name:string,
    parser_token:string,
    connection_id:string
}

export {ScriptNetServerObj,ScriptNetClientObj}