/*

An abstraction layer over the different browser storage engines. 
Also dot.notation.for.your.keys. Goals:

Any storage engine can be used, like window.localStorage, or chrome.storage.local etc.

Simplified, synced reading, like var user = config.get('user');

With the DotConfig class, a dot notation like 'dialog.title.color' 

To achieve all of this, all the config data is stored under **one** key (by default called simply 'config'), 
so it's probably not a good option to store huge amounts of data, it's more tailored for application 
configuration.


Source: https://github.com/kpion

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
config.set('dialog.title.color','red');
console.log(config.get('dialog.title.color'));//'red'

with this, our html form could look like this:
<input ... name = 'dialog.title.color'>
<input ... name = 'dialog.title.width'>

...
for each element in form, do config.set(element.name,element.value);

*/ 

class Config{

    constructor(params = {}){
        params = Object.assign({
            //default values:
            mainKey : 'config',
            default : {},//useful before .load. When .load is used it's merged into default.
            //storage: window.localStorage,//that  will be default if none provided
            autoSave: true,//should we call .save() on every .set and .setAll methods. 
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

    /**
    * Since it's anync operation, you might want to pass a callback.
    * @param callback - a callback called when operation is done.
    */
    load(callback = null){
        if(this.storage === null){//dummy one, for tests maybe, we pretend we're fine and happy 
            if(callback){
                callback(this.data);
            }
            return this;
        }

        //if storage is window.localStorage or window.sessionStorage.
        if(typeof this.storage.getItem === 'function'){
            let data = JSON.parse(this.storage.getItem (this.params.mainKey)) || null;
            
            if(data){
                //Object.assign(this.data, data);
                this.data = data;
                this.loaded = true;
            }    
            
            if(callback){
                callback(data);
            }
            return this;
        }

        //must be chrome/browser.storage.local/session/sync
        this.storage.get(this.params.mainKey,data => {
            if(typeof data === 'undefined'){
                this.lastError = chrome.runtime.lastError;
                callback(null);
                return;
            }
            if(data[this.params.mainKey]){
                Object.assign(this.data, data[this.params.mainKey]);  
                this.data = data[this.params.mainKey];
                this.loaded = true;
            }
            if(callback){
                callback(data[this.params.mainKey] || null);
            }
        });
        return this;
    }

    save(callback = null){
        if(this.storage === null){//dummy one, for tests maybe, we pretend we're fine and happy 
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

    /**
     * 
     * @param {string} key 
     * @param {scalar|object} val 
     * @param {bool} saveNow - should we also flush everything to the storage. 
     *                         null means 'auto', i.e. depends on the params.autoSave.
     */
    set(key, val, saveNow = null){
        this.data[key] = val;
        return this._saveConditionally(saveNow);
    }


    /**
     * 
     * @param {string} key 
     * @param {bool} saveNow - should we also flush everything to the storage. 
     *                         null means 'auto', i.e. depends on the params.autoSave.
     */
    remove(key, saveNow = null){
        delete this.data[key];
        return this._saveConditionally(saveNow);     
    }

    getMainKey(){
        return this.params.mainKey;
    }

    /**
     * 
     * @param {Object} data to put, will be cloned. 
     * @param {bool} saveNow - should we also flush everything to the storage. 
     *                         null means 'auto', i.e. depends on the params.autoSave.
     */
    setAll(data, saveNow = null){
        this.data = JSON.parse(JSON.stringify(data));
        this._saveConditionally(saveNow);
        return this;
    }

    //read-write direct access to internal data object.
    //unless copy == true - then it's a copy
    all(copy = false){
        if(copy){
            return JSON.parse(JSON.stringify(this.data));
        }
        return this.data;
    }

    /**
     * alias for .all    
     */ 
    getAll(copy = false){
        return this.all(copy);
    }

    /**
     * 
     * @param {bool} saveNow - should we also flush everything to the storage. 
     *                         null means 'auto', i.e. depends on the params.autoSave.
     */
    clearAll(saveNow = null){
        return this.setAll({},saveNow);
    }

  

    /**
     * More a utility function which maybe should go somewhere else....
     * comparse recursively two objects and builds and returns an object with keys which are different 
     * (removed, added, changed).
     * May be useful with chrome.storage.onChanged.addListener((event)....
     * let diff = config.diff(event.config.oldValue,event.config.newValue);
     */
    diff (obj1, obj2 = null) {
        var result = {};

        if(obj2 === null){
            obj2 = this.data;
        }
        //going with properties in object 1
        for (var p in obj1) {
            //if object2 doesn't even have this property, we're done here
            if(typeof obj2 === 'undefined' ||  !obj2.hasOwnProperty(p)) {
                result[p] = {};
                continue;
            }
            if(typeof (obj1[p]) === 'object' &&  typeof (obj2[p]) === 'object'){
                let deepResult = this.diff(obj1[p], obj2[p]);
                if(Object.keys(deepResult).length !== 0) {
                    result[p] = deepResult;
                }
            }else{
                if (obj1[p] != obj2[p]) {
                    result[p] = {};
                }
            }
        }
    
        //Are there any properties in object 2 missing in object 1?
        for (var p in obj2) {
            if (typeof obj1 === 'undefined' || typeof obj1[p] == 'undefined') {
                result[p] = {};
            }
        }
        //return true;
        return result;
    };

    /**
     * Internal only. Used by .set,.setAll, .remove  - will save depending on the (bool) saveNow param
     * optionally passed to those methods.
     * @param {bool} saveNow - should we also flush everything to the storage. 
     *                         null means 'auto', i.e. depends on the params.autoSave.
     */
    _saveConditionally(saveNow = null, callback = null){
        if(saveNow || (saveNow === null && this.params.autoSave)){
            return this.save(callback);
        }    
        return this;        
    }
}

class DotConfig extends Config{
    constructor (params = {}){
        super(params);
    }

    /**
     * 
     * @param {string} keyPath path to the key like 'dialog.width'
     * @param {scalar|object} val 
     * @param {bool} saveNow - should we also flush everything to the storage. 
     *                         null means 'auto', i.e. depends on the params.autoSave.
     */
    set(keyPath, val, saveNow = null){
        this._objPath(keyPath.split('.'),this.data, val);
        return this._saveConditionally(saveNow); 
    }

    /**
     * 
     * @param {string} keyPath path to the key like 'dialog.width'
     * @param {scalar|object} defaultVal 
     */
    get(keyPath, defaultVal = null){
        let result = this._objPath(keyPath.split('.'),this.data);
        return typeof result === 'undefined' ? defaultVal : result;
    }

    /**
     * 
     * @param {string} keyPath path to the key like 'dialog.width'
     * @param {bool} saveNow - should we also flush everything to the storage. 
     *                         null means 'auto', i.e. depends on the params.autoSave.

     */
    remove(keyPath, saveNow = null){
        this._objPath(keyPath.split('.'),this.data, undefined, true);
        return this._saveConditionally(saveNow);       
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