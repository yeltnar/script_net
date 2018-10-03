//import WsEventType from "./Interfaces/WsEventType.enum"
var EventEmitter = require('events');
var ee = new EventEmitter();
// ee.on(WsEventType.HTTP,()=>{
//     console.log(WsEventType.HTTP);
// });
// //ee.emit(WsEventType.HTTP)
// for( let k in WsEventType ){
//     console.log( k );
//     ee.emit( WsEventType[k] );
// }
