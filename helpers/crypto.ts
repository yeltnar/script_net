const msg = require("uuid/v4")();
const crypto = require('crypto');
function sha512HexHash(msg){
    return crypto.createHash('sha512').update(msg).digest('hex');
};

const hash_test_string = "hash_test_string"
console.log( "testing hash... `"+hash_test_string+"` `"+sha512HexHash(hash_test_string)+"`" );

export default sha512HexHash;