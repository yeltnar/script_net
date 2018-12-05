const uuid_v4 = require("uuid/v4");
const fs = require('fs');

const file_path = "./.script_id";

function get_script_net_connector_token():string{
    const exsists = fs.existsSync(file_path);

    let uuid;

    if( exsists ){
        uuid = fs.readFileSync(file_path).toString();
    }else{
        uuid = uuid_v4();
        fs.writeFileSync(file_path, uuid);
    }

    return uuid;
}

export default get_script_net_connector_token;