function setRestartTimer( timeoutFunct:Function, ms:number ):{resetRestartTimer, clearRestartTimer}{

    console.log("setRestartTimer "+ms)

    const timeout_id = setTimeout(()=>{ 
        clearRestartTimer();
        console.log("timeout met");
        timeoutFunct();
    }, ms);

    const clearRestartTimer = ()=>{
        console.log("clearRestartTimer");
        clearInterval(timeout_id);
    };

    const resetRestartTimer = ()=>{
        console.log("resetRestartTimer");
        clearInterval(timeout_id);
        setRestartTimer( timeoutFunct, ms );
    }

    return {resetRestartTimer, clearRestartTimer};
}

module.exports = setRestartTimer;