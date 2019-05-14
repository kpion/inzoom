/**
 * In zoom context menu.
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
  
        front : {
          title: 'Bring to front',
          action: 'front',
          data: '',
        },        
  
        reset : {
          title: 'Reset (esc)',
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
     * @param {bool} onlyIfEnabledInConfig - by def. true. If for some weird reason we want to 
     * override config's "no menu please" then with this one
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
          //contexts: will NOT be taken from 'parent' menu node in chrome, only in FX, so we add it anyway.
          'contexts': contexts
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