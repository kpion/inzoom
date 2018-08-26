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
    config.setAll(application.config).save();
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


