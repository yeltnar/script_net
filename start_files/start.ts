const pm2 = require('pm2');
const fs = require('fs');

interface script_info{
    name:string,
    script:string,
    cwd:string,
    args:[string],
}

const start_file = process.argv[2] || "start.json";

const scriptArr:[script_info] = JSON.parse( fs.readFileSync(start_file).toString() );

pm2.connect(function(err) {
    if (err) {
      console.error(err);
      process.exit(2);
    }

    const promise_arr = [];

    scriptArr.forEach(( cur:script_info )=>{

        promise_arr.push(new Promise((resolve, reject)=>{

            const { script, args, cwd, name } = cur;

            console.log({ script, args, cwd, name })

            if( undefined===script || undefined===args || undefined===cwd || undefined===name ){
                throw new Error("all fields not provided by scriptArr element");
            }

            pm2.start({...cur},()=>{
                resolve()
            });

        }));
        
    })

    Promise.all(promise_arr).then(()=>{
        pm2.disconnect();
    });
});