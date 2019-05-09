
/**
 * some common stuff shared among application elelements like background, content, action scripts.
 * and the inzoom itself (indirectly) 
 * 
 * including 'defaultConfig' which actually might go somewhere else.
 */
const app =  {
    /*
    default configuration, this will be saved to storage.local and from now on will be used from there.
    except for testing the files outside an extension - this is the only source of config values then.
    This key will be saved to the storage.local (or similar)
    */     
    defaultConfig: {

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
        },

        contextmenu: {
            enabled: true,
            //show default context menu (not a site's one, like youtube's)
            enforceDefault : true,
            tests: false,
        },

        //the 'bring to front' action
        front : {
            modifiers : {
                shift : true,
                ctrl : true,
                alt : false,
            },
            key: 221,//']'
            wheel : {
                direction: 0,//0: normal, 1 : reversed
            },    
    
        },        
    },

    evnironment : 'prod',//'prod' or 'dev'.

    isDev : function(){
        return (this.evnironment && this.evnironment.toUpperCase()  == 'DEV');
    },
};

/**
 * Logger: a console.log which can be globally enabled/disabled, with a prefix
 * **and** showing the right file and line number in console (i.e. wherever the function was called)
 * 
 * Usage example: 
 * 
 * var logger = new Logger('module xyz:');
 * logger.log('blah');
 * 
 * or enabled/disabled depending on environment (dev/prod):
 * var logger = new Logger('module xyz:',app.isDev());
 * 
 * the above will output module xyz: blah and report the right file and line number 
 */
class Logger{
	constructor(prefix = '', enabled = true){
        if(!enabled){
            this.log = function(){};
            return;
        }        
        this.log = function() {
            return Function.prototype.bind.call(console.log, console, prefix);
        }();
	}
}

