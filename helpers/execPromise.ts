const {exec, execFile} = require("child_process")

function execPromise(command){
    return new Promise((resolve, reject)=>{


        exec(command, (err, stdout, stderr)=>{
            if(err){
                console.error(err)
                console.error(command+" failed exec err")
                return reject(err);
            }else if(stderr){
                console.log(command+" failed stderr "+stderr)
                return resolve(stderr);
            }else{
                console.log(command+" success "+stdout)
                return resolve(stdout);
            }
        });
    })
}

export default execPromise;