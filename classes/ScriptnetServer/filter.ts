// I do want these different ones
import {CloudEventContainer, checkEventContainer} from "../../interfaces/script_loader.interface"

function filter(ws, required_keys_table, data:CloudEventContainer, script_event_string:string):Promise<CloudEventContainer>{

    return new Promise((resolve, reject)=>{

        checkEventContainer(data);

        let test_result = true;

        // check if meta data matches 
        if( data.device_meta_data!==undefined ){
            for( let k in data.device_meta_data ){
                test_result = test_result && ws.device_meta_data[k] === data.device_meta_data[k];
            }
        }

        data.event_name = script_event_string;

        // TODO check required keys

        if( test_result ){

            console.log("sending to client");
            console.log(data);

            resolve( data );
        }else{

            console.log("not sending to client");
            console.log(data);

            resolve();
        }

    });
}

export {filter}