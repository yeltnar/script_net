// I do want these different ones
import {CloudEventContainer, checkEventContainer} from "../../interfaces/script_loader.interface"

function filterAndSend(ws, data:CloudEventContainer){
    checkEventContainer(data);

    let test_result = true;

    // check if meta data matches 
    if( data.device_meta_data!==undefined ){
        for( let k in data.device_meta_data ){
            test_result = test_result && ws.device_meta_data[k] === data.device_meta_data[k];
        }
    }

    ws.send( JSON.stringify(data) );

}

export {filterAndSend}