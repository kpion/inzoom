'use strict';

var logger = new Logger('inzoom bkg: ', app.isDev());
logger.log('starting background.js');

//reading & writing to storage.local: 
let config = new DotConfig({
  storage: chrome.storage.local,
  autoSave: false,
  default: app.defaultConfig,
});



//ehhh, flag if we're inside the onInstall::config.save process so, we'll act accordingly
//in the chrome.storage.onChanged.addListener handler... 
let doingInstallConfigSave = false;
/**
 * scenarios:
 * 
 * data in browser storage might exist  - on usual browser startup or when doing 'update'.
 * data in browser storage might be non existing - in case of first install or remove+install.
 * 
 * when doing 'update' or 'install' the below method onInstallOrUpdate is called, *asynchroniusly*,
 * 
 * Minor issue : in FX we are started after many of tabs are already injected with our injection script o.O
 */


//////////////////////////////////////////////////////////////////////////////////////////
//context menu

/**
 * @todo - this should go to a separate file. 
 */
class InZoomContextMenu{

  /**
   * @param DotConfig config, assuming it's a  **reference**, so it cannot get deleted
   */
  constructor(config){
    this.config = config;   
    this.createCommands();
  }

  createCommands(){

    this.commands = {
      zoomIn : {
        title: 'Zoom in',
        action: 'transform',
        data: 'scale(1.2,1.2)',
      },

      zoomOut: {
        title: 'Zoom out',
        action: 'transform',
        data: 'scale(0.8,0.8)',
      },    

      separator1:{
        type: 'separator',
      },

      rotateLeft : {
        title: 'Rotate 90° left',
        action: 'transform',
        data: 'rotate(-90deg)',
      },      

      rotateRight : {
        title: 'Rotate 90° right',
        action: 'transform',
        data: 'rotate(90deg)',
      },  

      rotate180 : {
        title: 'Rotate 180°',
        action: 'transform',
        data: 'rotate(180deg)',
      },        

      separator2:{
        type: 'separator',
      },

      reset : {
        title: 'Reset',
        action: 'reset',
        data: '',
      },        
            
      
      /*
      
      //there is a small issue described in inzoom.js
      properties:{
        title: 'Properties',
        action: 'properties',        
      },*/
    };

    if(config.get('contextmenu.tests')){
      this.commands.tests = {
        title: 'Tests (45°)',
        action: 'transform',
        data: 'rotate(45deg)',        
      };
    }
  }

  /**
   * @param DotConfig config
   * @param {bool} onlyIfEnabledInConfig - by def. true. If for some weird reason we want to override config's "no menu please" then with this one
   */
  create(onlyIfEnabledInConfig = true){

    //just in case something changed in 'config'
    this.createCommands();

    logger.log('create ctx menu called');
    if(this.config && this.config.get('contextmenu.enabled')  == false && onlyIfEnabledInConfig){
      logger.log ('  aborting');
      return false;
    }
    logger.log('  creating ctx menu, config:',this.config.all(true));

    //everything except browser_action, page_action, 
    //p.s. these are fx specifix, cannot used in chrome (error): tab, tools_menu, bookmark,'password'
    //p.s. chrome says only these are allowed:
    // [all, page, frame, selection, link, editable, image, video, audio, launcher, browser_action, page_action]
    const contexts = ['audio','editable','frame','image','link','page','selection','video'];

    //main extension' menu
    chrome.contextMenus.create({
      id: "inzoom-root",
      title: 'In Zoom',
      'contexts': contexts,
    });

    Object.keys(this.commands).forEach(id => {
      let command = this.commands[id];
      chrome.contextMenus.create({
        parentId: "inzoom-root",
        "id": id,
        title: command.title,
        type : command.type || 'normal', 
        'contexts': contexts//will NOT be taken from 'parent' menu node in chrome, only in FX, so we add it anyway.
      });         
    });

  

  }

  recreate(){
    this.removeAll();
    return this.create();
  }

  getCommand(id){
    return this.commands[id] || null;
  }

  removeAll(){
    logger.log('  ctx: removing');
    chrome.contextMenus.removeAll();
  }

  /**
   * should be called only once per background.js start.
   */
  startListenning(){
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      let command = contextMenu.getCommand(info.menuItemId);
      if(command){
        chrome.tabs.sendMessage(tab.id,
          {
            command: {
              id: info.menuItemId,
              action: command.action,
              data: command.data,
    
              //can be useful to determine if we should actually process this command:
              invokeInfo:{
                pageUrl: info.pageUrl,
                frameUrl: info.frameUrl,
                reason: 'contextmenu',
              }
          }},{
            //frameId  : 0 - ? Otherwise will send it to all the iframes inside tab.... which in turn means that the tab
            //might get the message many many times (if there are iframes inside)
            //and yes, we *want* it. Then in inzoom.js we check if we actually should do something.
            //frameId : 0,
          }
      ); 
      }
    });
    
  }
};

//it will be InZoomContextMenu when the config will be loaded
var contextMenu = null;

config.load((data) => {
  //all of this happens once on browser start or extension install/update
  logger.log('config.load data: ',data);
  contextMenu = new InZoomContextMenu(config);
  contextMenu.create();
  contextMenu.startListenning();
});


/*  
called when the extension is installed.
*/
function onInstallOrUpdate(details){

  logger.log('on install details:', details);

  // 'reason' === 'update' *also* when using 'reload' in chrome and FX.
  // It's 'install' only when first removing and then installing again the ext.
  if(details.reason === 'install' || details.reason === 'update'){//all options:  "install" "update" "browser_update" "shared_module_update"
    //saving our default config
    //config.setAll();
    //logger.log('loaded defaults: ', app.defaultConfig);
    //logger.log('just after loading defaults: ', config.all(true));//we still have it...
    logger.log('  saving config to storage.');
    doingInstallConfigSave = true;
    config.save(() => {
      logger.log('config after install and save: ',config.all(true));
      doingInstallConfigSave = false;
      //yeah, this one works:
      //chrome.runtime.openOptionsPage(); 
    });
  }
  
}

chrome.runtime.onInstalled.addListener((details) => {
  onInstallOrUpdate(details);
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

//////////////////////////////////////////////////////////////////////////////////////////////
//end of context menu