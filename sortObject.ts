function sortObject( obj ){

	if( typeof obj === "object" && !Array.isArray(obj) ){

        const newObj = {};
        const obj_keys = Object.keys(obj).sort();

        for(let i=0; i<obj_keys.length; i++){

            let cur_key = obj_keys[i];

            newObj[cur_key] = sortObject( obj[cur_key] );

        }

        obj = newObj;
		return newObj;
		
	}else if( Array.isArray(obj) ){
        
        obj.forEach((cur, i, arr)=>{
            obj[i] = sortObject( cur );
        });

    }else{
		// don't know how to sort it or dont want to
		return obj;
	}
}

export default sortObject;