// c = need one for request type

// need one for just parser name
// need one for just device name
// need one for just group name
// b = need one for all combinations of the above (not permutations due to sorting keys)

// a = need one for all permutations of endpoints 

// need one for all combinations of a and b and c 

import WsEventType from "./Interfaces/WsEventType.enum"
import Status from "./Interfaces/Status.enum"
import InitMessage from "./Interfaces/RegisterInterfaces/InitMessage.interface"

import sortObject from "./sortObject"

const EventEmitter = require('events');

const ee = new EventEmitter();

ee.on(WsEventType.HTTP,()=>{
    console.log(WsEventType.HTTP);
});

//ee.emit(WsEventType.HTTP)

// for( let k in WsEventType ){
//     console.log( k );
//     ee.emit( WsEventType[k] );
// }

//let registerer:InitMessage = {
let registerer = {
    name:"test_name",
    device:"test_device",
    group:"test_group",
    registered_events:[{
        type:WsEventType.INIT
    },{
        status:Status.NEW
    },{
        type:WsEventType.INIT,
        status:Status.NEW
    },{
        status:Status.NEW,
        type:WsEventType.INIT
    }],
    "dont_keep_this":"dont_keep_this"

}

// if true value should be defined. If false value should be undefined. If both should be 
const wanted_keys_obj = {
    name: [true],
    device: [true],
    group: [true],
    registered_events: [true],
    //dont_keep_this: [true]
};

let new_registerer = removeUnwantedKeys( registerer, wanted_keys_obj );
new_registerer = sortObject( registerer );
console.log(new_registerer);

// registerer.registered_events.forEach((cur, i, arr)=>{
//     let s="";

//     Object.keys(cur).forEach((cur_key, i, arr )=>{
//         s += cur[cur_key]

//         if( i+1 !== arr.length ){
//             s+="\\"
//         }
//     })

//     if( s==="" ){
//         return;
//     }
//     console.log("adding -"+s);
//     ee.on( s, f );
// });

function removeUnwantedKeys( registerer, wanted_keys_obj ){
    for( let k in  wanted_keys_obj ){
        wanted_keys_obj[k].forEach;
    }
}


enum X {
    "a" = "a"
}

X["b"] = "b";

let x:X = X.a;