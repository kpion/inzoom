/*

An abstraction layer over the different browser storage engines. Also dot.notation.for.your.keys.

Any storage engine can be used, like window.localStorage, or chrome.storage.local etc.

All the data is stored under **one** key (by default called simply 'config'), so it's probably 
not a good option to store huge amounts of data, it's more tailored for application configuration.

more: https://github.com/kpion

Notes: 
 Should work fine in FX and Chrome and all the others
 The  chrome.storage.local (as well as .session, or .sync) are asynchronous and here in this class 
  .load and .save are asynchronous as well. 
 The config class stores a 'copy' of the data,  you work on that copy, then eventually save it.
 

Examples:

let config = new Config({
    //Optional defaults. Thanks to the them, our app can start and run when there is nothing in the storage yet. 
    default: {'answer': 42},
    //storage - defaults to wndow.localStorage, can be anything else, like chrome.storage.local or chrome.storage.sync etc.
    //storage: chrome.storage.local,
  }); 

config.load(() => {
    console.log('config data loaded:',config.all(true));//true simply means making a 'copy' 
    console.log(config.get('answer'));

    //this will also call .save() by default
    config.set('dialog',{width: 342, height:250});

    //if a subkey is wanted, then -  .all() gives direct access to the internal data object:
    console.log('dialog width:',config.all().dialog.width);
});

DotConfig: this class extends  Config, so everything's the same, except .get, .set  and .remove 
now accept "dotted" keys, like here:

let config = new DotConfig();
config.set('dialog.width',342);
console.log(config.get('dialog.width'));//342

*/ 

class Config{

    constructor(params = {}){
        params = Object.assign({
            //default values:
            mainKey : 'config',
            default : {},//useful before .load. When .load is used it's merged into default.
            //storage: window.localStorage
        }, params);  

        //this we handle differently, we use an existing object only when not passed in the constructor params 
        if(typeof params.storage === 'undefined'){
            params.storage = window.localStorage;
        }

        //to make accessing those ^ simpler:
        this.params = params;  
        this.data = params.default;
        this.storage = params.storage;

        this.loaded = false;
        this.lastError = null;
        
    }

    /*
    this one *merges* data from given storage area into current data (which by default is empty anyway). 
    If you want, you can do .clearAll(); before.
    Since it's anync operation, you might want to pass a callback.
    */
    load(callback = null){
        if(this.storage === null){//dummy one, we pretend we're fine and happy 
            if(callback){
                callback(this.data);
            }
            return this;
        }

        //if storage is window.localStorage or window.sessionStorage.
        if(typeof this.storage.getItem === 'function'){
            let data = JSON.parse(this.storage.getItem (this.params.mainKey)) || {};
            Object.assign(this.data, data);
            this.loaded = true;
            if(callback){
                callback(this.data);
            }
            return this;
        }

        //must be chrome/browser.storage.local/session/sync
        this.storage.get('config',data => {
            if(typeof data === 'undefined'){
                this.lastError = chrome.runtime.lastError;
                callback(null);
                return;
            }
            this.loaded = true;
            //this.data = data[this.params.mainKey] ? data[this.params.mainKey] : {};
            if(data[this.params.mainKey]){
                Object.assign(this.data, data[this.params.mainKey]);
            }
            if(callback){
                callback(this.data);
            }
        });
        return this;
    }

    save(callback = null){
        if(this.storage === null){//dummy one, we pretend we're fine and happy 
            if(callback){
                callback(this.data);
            }
            return this;
        }

        //if storage is window.localStorage or window.sessionStorage.        
        if(typeof this.storage.setItem === 'function'){
            this.storage.setItem (this.params.mainKey,JSON.stringify(this.data));
            if(callback){
                callback(this.data);
            }
            return this;
        }
        //must be chrome/browser.storage.local/session/sync
        this.storage.set({
            [this.params.mainKey] : this.data
        },callback);
        return this;
    }

    setAll(data, saveNow = true){
        this.data = data;
        if(saveNow){
            this.save();
        }        
        return this;
    }

    //alias for .all    
    getAll(copy = false){
        return this.all(copy);
    }

    clearAll(saveNow = true){
        return this.setAll({},saveNow);
    }

    //read-write direct access to internal data object.
    //unless copy == true - then it's a copy
    all(copy = false){
        if(copy){
            return JSON.parse(JSON.stringify(this.data));
        }
        return this.data;
    }

    /*
    @oaram string key - a single key. Or null - in this case everything will be returned.
    */
    get(key = null, defaultVal = null){
        if(key == null){
            //similar behaviour to the storage.get, returning entire data. A clone of it.
            return this.getAll(true); 
        }
        return typeof this.data[key] === 'undefined' ? defaultVal : this.data[key];
    }

    set(key, val, saveNow = true){
        this.data[key] = val;
        if(saveNow){
            this.save();
        }
        return this;
    }



    remove(key, saveNow = true){
        delete this.data[key];
        if(saveNow){
            this.save();
        }  
        return this;      
    }

}

class DotConfig extends Config{
    constructor (params = {}){
        super(params);
    }

    set(keyPath, val, saveNow = true){
        this._objPath(keyPath.split('.'),this.data, val);
        if(saveNow){
            this.save();
        }
        return this; 
    }

    get(keyPath, defaultVal = null){
        let result = this._objPath(keyPath.split('.'),this.data);
        return typeof result === 'undefined' ? defaultVal : result;
    }

    remove(keyPath, saveNow = true){
        this._objPath(keyPath.split('.'),this.data, undefined, true);
        if(saveNow){
            this.save();
        }
        return this;         
    }


    //////////////////////////
    //dot notation.

    /*
        @internal, used for dot.notation.

        This probably cannot be really shorter, as we don't want to have exceptions throws on unexisting keys,
        we rather want to return with the default value (when reading) or create all the needed keys (when setting)

        @param array keyChain  - array of keys. NOT a string. Needs e.g. keyStr.split('.')
        @param object obj - object to work on, by design it's this.
        @param bool remove - should we remove the key?
    */
   _objPath(keyChain, obj, setTo = undefined, remove = false){
        let cur = obj;
        for (var index = 0;index < keyChain.length; index++) //in contrast to .forEach we can break; or return inside.
        {
            let key = keyChain[index];

            if(typeof cur[key] === 'undefined'){
                if(setTo === undefined){
                    return undefined;
                }
                //assigning a value, so lets create a missing key.
                cur[key] = {};
            }

            //we are *assigning* the key value to something
            if(setTo !== undefined ){
                //is it the last key? If so, lets assign to it.
                if(index === (keyChain.length -1)){
                    cur[key] = setTo;
                }else{
                    //it's some key along the way, not the last one. Which means, it has to be an object
                    if(typeof cur[key] !== 'object'){
                        throw `.${key} already exists and is not an object (while trying to create a subkey in it)`;
                    }
                }
            } 

            if(remove){
                //last key?
                if(index === (keyChain.length -1)){
                    delete cur[key];
                }
            }

                    
            cur = cur[key];

        
        }
        return cur;
    }    
}