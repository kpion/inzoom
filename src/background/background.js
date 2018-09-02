'use strict';
console.log('starting background.js');

//reading & writing to storage.local: 
let config = new Config({
  storage: chrome.storage.local
});


/*  
called when the extension is installed.
*/
function install(details){

  console.log('on install details:', details);

  //'reason' === 'update' *also* when using 'reload' in chrome (and probably in fx too). It's 'install'
  //when first removing and then installing again the ext.
  if(details.reason === 'install' || details.reason === 'update'){//all options:  "install" "update" "browser_update" "shared_module_update"
    //saving our default config
    config.setAll(application.config).save(() => {
      //yeah, it works.
      //chrome.runtime.openOptionsPage(); 
    });
  }
  
}

chrome.runtime.onInstalled.addListener((details) => {
  install(details);
});

//some testing:
function handleMessage(request, sender, sendResponse) {
  console.log("Message from the content script: ", request);
  sendResponse({
    text: "Response from background script",
  });  
}
chrome.runtime.onMessage.addListener(handleMessage);

/**
 * @todo - this should go to a separate file. 
 */
class InZoomContextMenu{

  constructor(){

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
      }    
    };
  }

  create(){
    //main extension' menu
    chrome.contextMenus.create({
      id: "inzoom-root",
      title: 'Inzoom',
      contexts: ["all"]
    });

    Object.keys(this.commands).forEach(id => {
      let command = this.commands[id];
      chrome.contextMenus.create({
        parentId: "inzoom-root",
        "id": id,
        title: command.title,
        //contexts: ["all"]//will be taken from 'parent' menu node.
      });         
    });
  }

  getCommand(id){
    return this.commands[id] || null;
  }
};
/*
  chrome.contextMenus.create({
    id: 'inzoom-separator-1', 
    parentId: "inzoom-root", 
    type: 'separator', 
    contexts: ['all']
  });

  chrome.contextMenus.create({
    id: "inzoom-command-2",
    parentId: "inzoom-root",  
    title: 'title 2',
    
    contexts: ["all"]
  });
  */

var contextMenu = new InZoomContextMenu();
contextMenu.create();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log(info);
  console.log(tab);
  //browser.tabs.sendMessage(tabId, {type: t, value: v});
  let command = contextMenu.getCommand(info.menuItemId);
  if(command){
    chrome.tabs.sendMessage(tab.id,{command: {
      id: info.menuItemId,
      action: command.action,
      data: command.data,
    }}); 
  }
});


