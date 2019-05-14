'use strict';

/*
 * scenarios:
 * all of this happens once on browser start or extension install/update
 * 
 * data in browser storage might exist  - on usual browser startup or when doing 'update'.
 * data in browser storage might be non existing - in case of first install or remove+install.
 * 
 * when doing 'update' or 'install' the method handler onInstalled is called, *asynchroniusly*,
 * 
 * Minor issue : in FX we are started after many of tabs are already injected with our injection script o.O
*/

var logger = new Logger('inzoom bkg: ', app.isDev());
logger.log('starting background.js');

//e.g. extensionManifest.version etc.
const extensionManifest = chrome.runtime.getManifest();

//config - starting with defaults
//we first load *defaults* here (from app.defaultConfig), 
//later the local config in config.load (much below)
let config = new DotConfig({
    storage: chrome.storage.local,
    autoSave: false,
    default: app.defaultConfig,
});


/* 
onInstalled
notes: 
details.reasson: 
It's 'install' only when first installing, or removing and then reinstalling again the ext.

It's 'update' when doing 'refresh' in extension list in both chrome and fx, 
and also when browser is updating the extension.

When it is 'install', then... this handler, at least in chrome,  is called very soon, before 
config.load handler is called

But, when it's 'update', this handler is called quitte late, i.e. after the 
config.load handler is called;
*/
chrome.runtime.onInstalled.addListener((details) => {
    logger.log('on install / update details:', details);  
    doingInstallConfigSave = true;

    if(details.reason === 'update'){
        //Here we have some job to do. It's possible that new config keys were introduced in the app.js
        //they were not yet introduced into the storage. On the opposite - the old storage was put into
        //our config var.
        //We need to find what's new in the app.defaultConfig and bring it to the config 
        //(both our var and local storage)
        const  diff = config.diff(app.defaultConfig,config.data,{
            missingOnRight:true,
            missingOnLeft:false,
            different:false,
        }); 

        config.setMissing(app.defaultConfig);
        config.save();
        doingInstallConfigSave = false;
        return;
    }

    if(details.reason === 'install'){
        
    }
    
    //saving the 'default' config (which we already have here) to the storage
    config.save(() => {
        logger.log('config after install and save: ',config.all(true));
        doingInstallConfigSave = false;
    });  
});




//ehhh, flag if we're inside the onInstall::config.save process so, we'll act accordingly
//in the chrome.storage.onChanged.addListener handler... 
let doingInstallConfigSave = false;

//it will be InZoomContextMenu when the config will be loaded
var contextMenu = null;

//loading config from storage if any
//some things we can do only after loading config
//btw, first we loaded the defaults in `let config = new DotConfig...` earlier in this script.
config.load((data) => {
    logger.log('config.load data: ',data);
    contextMenu = new InZoomContextMenu(config);
    contextMenu.create();
    contextMenu.startListenning();
});


//we'll get this event also just a second after installation, due to saving default options
//to storage.  
//yeah, we'll do this twice when first installed. But so what.
chrome.storage.onChanged.addListener((event) => {
  logger.log('storage changed',event);
  //lets note what's changed.
  let diff = {};
  if(event[config.getMainKey()]){
    diff = config.diff(event[config.getMainKey()].newValue); 
  }
  logger.log('  diff:',diff);

  if(!doingInstallConfigSave){
    config.clearAll();
    config.load(() => {
      //depending on changes:
      if(diff.contextmenu){
        logger.log('  context menu changed!');
        contextMenu.recreate();    
      }    
    });    
  }
  


});


//some testing:
function handleMessage(request, sender, sendResponse) {
  logger.log("Message from the content script: ", request);
  sendResponse({
    text: "Response from background script",
  });  
}
chrome.runtime.onMessage.addListener(handleMessage);

