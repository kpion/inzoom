/*
default configuration, this will be saved to storage.local and from now on will be used from there.
except for testing the files outside an extension - this is the only source of config values then.
*/ 
const application =  {
    //this key will be saved to the storage.local (or similar)
    config: {
        zoom : {
            modifiers : {
                shift : true,
                ctrl : false,
                alt : false,
            },
            wheel : {
                direction: 0,//0: normal, 1 : reversed
            },    
    
        },
    
    
        dragging : {
            enabled : true
        }
    }
};
