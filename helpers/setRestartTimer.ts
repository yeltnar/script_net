function setRestartTimer( timeoutFunct:Function, ms:number ):{resetRestartTimer, clearRestartTimer}{

    const timeout = setTimeout(()=>{ 
        // console.log("timeout met "+(timeout));
        // console.log((timeout));
        timeoutFunct();
    }, ms);

    let local_clearRestartTimer = ()=>{
        // console.log((timeout));
        clearTimeout( timeout );
    };

    let local_resetRestartTimer = ()=>{
        // console.log((timeout));
        clearTimeout( timeout );

        const {clearRestartTimer,resetRestartTimer} = setRestartTimer( timeoutFunct, ms );
        
        local_clearRestartTimer = clearRestartTimer;;
        local_resetRestartTimer = resetRestartTimer;;
    }

    // have to do it like this so the refrences don't need changing after setRestartTimer is called 
    return {
        clearRestartTimer:()=>{
            local_clearRestartTimer();
        },
        resetRestartTimer:()=>{
            local_resetRestartTimer();
        } 
    };
}

module.exports = setRestartTimer;