"use strict";

/*
this is the inzoom core. Included by extension (in manifest.json)
as well, as can be tested standalone in any page.
*/

//are we inside an extension or simply on a page as script src = '...'
let insideExtension = (
    typeof(browser) === 'object' || 
    (typeof chrome === 'object' && typeof chrome.extension === 'object'));

var logger = new Logger('inzoom: ', app.isDev());


/*
utility, splits e.g. 12px to 12 and px; same with '%' eg:
let nu = new NumberUnit('-12.3px');nu.value *= 2;console.log(nu.combine());//24.6px
*/
class NumberUnit{
    constructor(str){
        this.value = null;
        this.unit = null;//whatever was after a number, could be e.g.  'px' or '%'
        this.parse(str);
    }
    parse(str){
        this.value = parseFloat(str);
        this.unit = str.match(/[a-zA-Z%]+/g);
    }

    combine(){
        return this.value + (this.unit ? this.unit : '');
    }
}

/*
This takes care about moving (dragging) DOM Elements.
It works by creating a new instance for every element, which is to be draggable.
@todo move it to a separate file.
*/
class ElementDraggable{

    constructor(element = null){

        this.lelement = null;
        this.lastMousePos = new Point();
        this.mouseIsDown = false;
        this.wasMovement = false;
        if(element){
            this.attach(element);
        }

    }

    attach(element){
        this.lelement = l(element);
        element.classList.add('inzoom-draggable');
        this.lelement.on('mousedown', (event) => {
            if(event.button === 0){//left mouse button
                this.mouseIsDown = true;
                this.lelement[0].classList.add('inzoom-dragging');
                //'offset' relative to top/left of clicked element. So if clicked at exactly topleft we'll have 0,0 here  
                //10,0 means 10 pixels to the right
                //offset.set(event.clientX - div.offsetLeft, event.clientY - div.offsetTop); 
                //było offset = :
                //x: div.offsetLeft - e.clientX,
                //y: div.offsetTop - e.clientY
        
                this.lastMousePos.set(event.clientX, event.clientY);

                //preventing entering the 'drag' mode in FX.
                //this is required by fx when img (or other element) is in <a href...>, 
                //even doing 'preventDefault' on 'dragStart' doesn't help
                event.preventDefault();

          }
    
        }, true);
    
        document.addEventListener('mouseup', () => {
            this.lelement[0].classList.remove('inzoom-dragging');
            this.mouseIsDown = false;
        }, true);
    
        document.addEventListener('mousemove', (event) => {
            
            if (this.mouseIsDown) {
                event.preventDefault();
                this.wasMovement = true;
                //we want to know a difference in position, between last mouse pos and current mouse pos.
                //this will give us an idea about how much move the element (we can't use absolute values here, with transformations, afaik) 
                let offset = new Point(event.clientX - this.lastMousePos.x, event.clientY - this.lastMousePos.y);
                let computedStyle = window.getComputedStyle(this.lelement[0]);
                //by def. it's 'none'
                let transform = computedStyle.transform;  
                if(transform === 'none'){
                    transform = '';
                }else{
                    let arTransform = this.transformationFromString(transform);
                    if(arTransform){
                        if(arTransform[0] != 0 && arTransform[3]){
                            offset.divide((arTransform[0]), (arTransform[3]));
                        }
                    }
                }
                //we cannot do div.style.transform+=... because if transformations are set in .css it won't be here. 
                this.lelement[0].style.transform = transform + ` translate(${offset.x}px,${offset.y}px)`;
                this.lastMousePos.set(event.clientX, event.clientY);
            }
        }, true);      

        //fx seems to require it on linked images. 
        //Or maybe not, preventDefault on mouseDown seems to do the job
        /*
        this.lelement.on("dragstart", function( event ) {
            event.preventDefault();
            event.stopPropagation();
            console.log('prevented dragstart');
            return false;            
        }, false);        
        */

        this.lelement.on('click', (event) => {
            let preventDefault = false;
            if(this.wasMovement){
                preventDefault = true;
            }
            this.wasMovement = false;
            if(preventDefault){
                event.preventDefault();
                event.stopPropagation();
                return false;
            }   
        },true)   

        document.addEventListener('keydown', (event) => {
            //maybe for some reason we got crazy with our dragdropping, and user pressed escape. 
            if (this.mouseIsDown && event.keyCode == 27){
                this.mouseIsDown = false;
                this.lelement[0].classList.remove('inzoom-dragging');
            }
            
           
        }, true);

        
    }

    /*
    returns an array of matrix values, i.e. from a string 'matrix(1,0,0,1,0,0)' it will return an array of 7 values.
    used by getElementTransform and maybe others.
    returns null if string doesn't match anything sensible. 
    @param string  transformationString - cannot be empty or 'none', that can of validation should be done earlier, will return
    null in those cases. 
    */
    transformationFromString(transformationString){
        let regex = /\((.*?),(.*?),(.*?),(.*?),(.*?),(.*?)\)/;
        let arTransform = transformationString.match(regex);  
        if(arTransform.length >  0){//it should be 7, but this test is future proof! :) 
            return arTransform.slice(1);//the first elem. is the whole match, which we don't want
        }
        return null;
    }

    /*
    returns a DOM element transform matrix as an array.
    when no modifications are done, then on positions 0 and 3 we have scale x and y, then on positions 5,6 we have translation.
    */
    getElementTransform(element){
        let computedStyle = window.getComputedStyle(element);
        //by def. it's 'none'
        let transform = computedStyle.transform;
        if(transform === '' || transform === 'none'){
            transform = 'matrix(1,0,0,1,0,0)';//default
        }
        return transformationFromString(transform);
    }

    /*
    var div;
    var isDown = false;
    var lastMousePos = new Point();
    
    
    div  = l('.inzoomMoveable');
    console.log('matrix:',getElementTransform(div));
    */
  
}
/**
 * @todo move it to a separate file
 */
class Utils{
    /**
     * Returns an inline style, i.e. element.style - thing is however it doesn't really work in FX,
     * because it's not really a simple object, instead it's a CSSStyleDeclaration and we should do it
     * this way.
     * Useful for making a 'backup' of user defined inline-style before changing it, so we can later modify it.  
     * @param HTMLElement element 
     * @return object with styles *modfied* by user. Otherwise it's not there. 
     */
    static getElementInlineStyle(element){
        var style = element.style;
        var result = {}; 
        for(let i = 0; i < element.style.length; i++) {
            let propName = style.item(i);
            //console.log(`Key: "${propName}" Value: "${styleDeclaration.getPropertyValue(propName)}"`);
            result[propName] = style.getPropertyValue(propName);
        }
        return result;
    }
}
class Inzoom{

    constructor(config){
        //config like wheel direction, keyboard shortcuts etc.
        this.config = config;
        //recently modified element (HTMLElement)
        this.curElement = null;
        //last element style *copied* before doing anything.
        this.curElementStyle = null;
        //recently used zindex, so... the next one in the next element selected will be higher:)
        this.lastZIndex = 0;
        //"current"  mouse position (as recorded in )  
        this.mousePos =  new Point();
        this.testMode = false;

        //on contextmenu event - needed when user runs a context menu command.
        this.contextMenuEvent = null;
    }

    //called when document ready and config loaded:
    run(){
        try{
            let hamsterTarget = document.body;
            Hamster(hamsterTarget).wheel((...params) => this.onWheel(...params));
        }catch(error){
            //the above happens really rarely, e.g. on .svg documents alone (not embedded but opened directly in browser)
            //we are catching this only to no pollute console with errors.
            return false;
        }
        //only for the sake of having this.mousePos (for... whatever reason)
        document.addEventListener('mousemove', (event) => {
            this.onMouseMove(event);
        }, true); 

        document.addEventListener('keydown', (event) => {
            this.onKeyDown(event);
        }, true);    
    
        
        //tests:
        //console.log('config.getAll get all:',this.config.getAll());
        if(insideExtension){
            //if config changed in storage, lets reread it.
            //btw. chrome.storage is not the same as config.storage, because the later is for example
            //chrome.storage.local
            chrome.storage.onChanged.addListener((event) => {
                //console.log('config changed for ' + window.location.href);
                this.config.clearAll(false).load();
            });

            chrome.runtime.onMessage.addListener(event => {
                this.onMessage(event);
            });                    

            //issue: context menu. In FX we need both rclick (useful when shift+rclick) and contextmenu isn't harmful here.
            //on chrome we *need* contextmenu.
            //we want to store clientX and clientY coordinates on context menu, will be useful when later user 
            //will really call a command from the context menu. Useful only when we're inside extension.
            document.addEventListener('click', (event) => {
                if(event.button === 2){
                    this.saveContextMenuEvent(event);
                }
            }, true);    

            document.addEventListener('contextmenu', (event) => {
                this.saveContextMenuEvent(event);
                //optional disabling website' context menu, which means the default one should appear.
                if(this.config.get('contextmenu.enforceDefault') && event.ctrlKey){
                    event.stopPropagation();
                }
            }, true);    

        }

        
    }

    /*
    will return an element information, in the context of our needs, 
    see 'result' object definition for more
    */
    getElementInfo(lElement){
        let result = {
            type : null, //img, background-image
            lElement : null,
        };
        let hElem = lElement[0];
        
        if(lElement.is('img')){
            result.type = 'img';
            result.lElement = lElement;
        }

        if(result.type === null && lElement.is('svg')) {
            result.type = 'svg';
            result.lElement = lElement;
        }

        if(result.type === null && lElement.is('canvas')) {
            result.type = 'canvas';
            result.lElement = lElement;
        }

        if(result.type === null) {
            let computedStyle = window.getComputedStyle(hElem);
            
            if(computedStyle['backgroundImage'] != '' && computedStyle['backgroundImage'] != 'none'){
                result.type = 'background-image';
                result.lElement = lElement;                
            }
        }     

        if(result.type === null && lElement.is('video')) {
            result.type = 'video';
            result.lElement = lElement;
        }
        return result;
    }
    /* 
    this function tries to find a target element (e.g. image) to zoom 
    should be an <img> or, if that cannot be found, any element with background-image, or ... if that cannot be
    found then IDK...
    @param  lElement - the (lightdom) element where the event (wheel, click, whatever) started.
    @param Point point : a mouse point
    **/
    findElement(lElement, point){
        //this metod will get what we understand we have in the element
        //return example:
        //{
           //type : null, //img, background-image
           //lElement : null,
        //}; 
        let result = {
            type : null, //img, background-image
            lElement : null,
        };               
        if(lElement != null){
            result = this.getElementInfo(lElement);
        };

        //if nothing recognized, we'll use another method 
        if(result.type === null){
            result = this.findElement2(document,point);
        }
        return result;
    }

    /* 
    we'll use current mouse pointer to find all the elements under cursor to find out 
    something which we can zoom in/out
    root at first is simply 'document', then, when going recursive, it can change into something else
    like a shadow element
    @param Document root - start node.
    @param Point point - mouse point to use in the search.
    */
    findElement2(root, point){
        let result = {
            type : null, //img, background-image
            lElement : null,
        };        
        //let elements = this.elementsFromPoint(event.clientX,event.clientY);
        let elements = root.elementsFromPoint(point.x, point.y); 
        
        for (var element of elements) {
            if(typeof element.shadowRoot !== 'undefined' && element.shadowRoot){
                //console.log('found shadow!:',element.shadowRoot);
                
                result = this.findElement2(element.shadowRoot, point);
                if(result.type !== null){
                    break;
                }
            }
            result = this.getElementInfo(l(element));
            if(result.type !== null){
                break;
            }
        }            
        
        return result;
        
    }
    /*
    modifies element's transform:matrix - used by zoomElement
    does not seem to be needed o.O see the zoomElement 
    */
    /*
    transformElement(lElement, ratio, computedStyle = null){
        if(computedStyle === null){
           computedStyle = window.getComputedStyle(lElement[0]);
        }
        //by def. it's 'none'
        let transform = computedStyle['transform'];
        if(transform === '' || transform === 'none'){
            transform = 'matrix(1,0,0,1,0,0)';
        }
        let regex = /\((.*?),(.*?),(.*?),(.*?),(.*?),(.*?)\)/;
        let arTransform = transform.match(regex);  
        if(arTransform && arTransform.length === 7){
            arTransform.splice(0,1);
            arTransform[0] *= ratio;
            arTransform[3] *= ratio;
            let newTransform = 'matrix(' + arTransform.join(',') + ')';
            lElement.css('transform', newTransform);
            return true;
        }      
        return false;
    }
    */

    
    /**
     
     * elementInfo - elementInfo  to work on, Usually found with this.findElement
     */ 
    zoomElement(elementInfo, deltaX, deltaY){
        //should we zoom IN or OUT
        let enlarge = null;
        if(this.config.get('zoom.wheel.direction') == 0){
            enlarge = deltaY > 0;
        }else{
            enlarge = deltaY < 0;
        }
        let ratio = enlarge ? 1.1:0.9;
        this.runCommand(elementInfo.lElement[0],{
            action: 'transform',
            data: `scale(${ratio},${ratio})`,
        });
    }

    findAndZoom(lElement, event, deltaX, deltaY){
        let found = this.findElement(lElement, new Point(event.clientX,event.clientY));
        if(found.lElement){
            this.zoomElement(found,deltaX, deltaY);
        }
    }

    /**
     * Used both by onWheel (eventually) and onContextMenu and possibly others.
     * @param {HTMLElement} target element 
     * @param {Object} command, with action and possible other properties. 
     */
    runCommand(element, command){
        
        if(command.action === 'transform'){
            let makeDraggable = false;

            //is this the exactly same element as last time?
            let curElementChanged = (this.curElement !== element);
            this.curElement = element;
            let lElement = l(element);
            let transitionDuration = 300;//ms
            
            if(curElementChanged){
                makeDraggable = true;
                this.curElementStyle = Utils.getElementInlineStyle(element);
                //lElement.css('outline','1px dotted red');
            }    
            
            //if called via context menu, we'll add some transitions here.
            if(command.invokeInfo && command.invokeInfo.reason === 'contextmenu'){
                lElement.css('transition-property','transform');
                lElement.css('transition-duration',`${transitionDuration}ms`);

                //restoring prev. style, if any
                setTimeout(()=>{
                    //lElement.css('outline',this.curElementStyle['outline'] || '');
                    lElement.css('transition-property',this.curElementStyle['transition-property'] || '');
                    lElement.css('transition-duration',this.curElementStyle['transition-duration'] || '');
                },transitionDuration);
            }
            let computedStyle = window.getComputedStyle(element);
            //this.transformElement(lElement,ratio);    
            let transform = computedStyle.transform;
            if(transform === '' || transform === 'none'){
                transform = 'matrix(1,0,0,1,0,0)';
            }         
            //hmmm it seems to work o.O and no - it doesn't accumulate, it's more like recalculated.   
            //element.style.transform = transform + ` scale(${ratio},${ratio})`;
            element.style.transform = transform + ' ' + command.data;
            //moving elements (dragging) 
            if(makeDraggable && this.config.get('dragging.enabled') === true){
                if(typeof element.inzoomDraggableInstance === 'undefined'){
                    element.inzoomDraggableInstance = new ElementDraggable(element);
                }
            }              
        }
      
        if(command.action === 'properties'){
            
            this.showModal('Inzoom element properties','<p>blah</p>');
        }
    }
    //wheel somewhere on the page (body)
    onWheel(event, delta, deltaX, deltaY){
        //if required modifier keys do not meet keyboard status:
        if((this.config.get('zoom.modifiers.ctrl') && !event.originalEvent.ctrlKey)
            || (this.config.get('zoom.modifiers.shift') && !event.originalEvent.shiftKey)
            || (this.config.get('zoom.modifiers.alt') && !event.originalEvent.altKey))
        {
            return;
        }
        event.originalEvent.preventDefault();
        this.findAndZoom(l(event.target),event.originalEvent,deltaX,deltaY);
    }

    //only for the purpose of having this.mousePos set
    onMouseMove(event){
        this.mousePos.set(event.clientX, event.clientY);
    }

    onKeyDown(event){
        //escape key on "our" curElement? Then we'll undo our changes.
        if(event.keyCode == 27){
            let foundResult = this.findElement(null, this.mousePos);
            if(foundResult.lElement && foundResult.lElement[0] === this.curElement){
                //this will revert changes made by zooming and dragging.
                this.curElement.style.transform = this.curElementStyle.transform || '';                     
            }
        }
    }

   
    /**
     * Creates (if needed) and shows the modal dialog.
     * 
     * @param {bool} onlyOne true: will first check if there is already one and will return that one if exists,
     *              if false: will create a new one (always).
     * @param {string} htmlcontent
     */
    showModal(title = '', content = '', onlyOne = true){
        logger.log('createModal');
        let elModal = document.querySelector('.inzoomModal');

        //lets create one, if needed:
        if(!onlyOne || !elModal){
            //making one:
            logger.log(' making.');
            elModal = document.createElement("div"); 
            elModal.classList.add('inzoomModal');
            document.body.insertAdjacentElement('beforeend',elModal);
        };

        //regardles if this is new or existing one, we set innerHTML to:
        elModal.innerHTML = `
            <a href="javascript:;" class="inzoomModalClose" title="Close Modal">X</a>
            <h3>${title}</h3>
            <div class="inzoomModalContent">
                ${content}
            </div>
        
        `;
        
        //this ^ means we cleared all the events, so:
        //l('.inzoomModal').classList.toggle('inzoomModalOn');
        l('.inzoomModal .inzoomModalClose').on('click',(eve)=>{
            eve.target.parentNode.classList.remove('inzoomModalOn');
        });

        //and finally - lets show it.
        elModal.classList.add('inzoomModalOn');
        return elModal; 
        
    }
 
    /**
     * 
     * A message sent e.g. by background.js with browser.tabs.sendMessage....
     * probably a context menu command.
     */
    onMessage(message){
        //console.log('-----------on message-------------');
        //console.log('  message: ', message);
        //console.log('  href: ',window.location.href);
        if(message.command){
            /* 
            ehhh, we're a bit tricky here. We can get called for every frame on a given page separetely.
            plus, if clicked inside frame, we can get called for this one frame as well, because we're inside it as well.
            passing 'frameId:0' to chrome.tabs.sendMessage does not solve anything, because with tihs we don't get any
            call for the menu click anywhere. 
            */            
            if(message.command.invokeInfo){
                let invokeInfo = message.command.invokeInfo;
                let abort = false;
                if(invokeInfo.frameUrl && invokeInfo.frameUrl !== window.location.href){
                    abort = true;
                }
                if(!invokeInfo.frameUrl && (invokeInfo.pageUrl !== window.location.href)){
                    abort = true;
                }
                if(abort){
                    //console.log(' inovocation url doesn\'t match our url, aborting');
                    return false;                    
                };   
            }
            
            
            if(message.command.action){//eg. 'transform'
                if(!this.contextMenuEvent || typeof this.contextMenuEvent.clientX === 'undefined'){
                    //for some reason we did not catch 'contextmenu' on this document ¯\_(ツ)_/¯ - probably 
                    //because there are iframes inside iframes or something...
                    logger.log('context menu command but contextMenuEvent empty');
                    return false;
                }
                let findResult = this.findElement2(document, new Point(this.contextMenuEvent.clientX,this.contextMenuEvent.clientY));
                //console.log('  ctx elem:', findResult);
                if(findResult.type){
                    this.runCommand(findResult.lElement[0],message.command);
                }else{
                    logger.log('context menu command but no elemeent found');
                }
            }
        }
    }

    /**
     * 
     * Fired when onClick with right mouse button, or on contextmenu event on THIS document. 
     * We need it to remember click position and maybe 
     * other things useful later when user fires a context menu command
     */
    saveContextMenuEvent(event){
        this.contextMenuEvent = {};
        //copying (only scalar props) to our contextMenuEvent
        for (var prop in event){
            if(typeof event[prop] === 'object'){
                continue;
            }
            this.contextMenuEvent[prop] = event[prop];
        }         
    };    
}


//just playing around
function inzoomSendMessage(param = 'default'){
    //tests:
    chrome.runtime.sendMessage({test: {
        param:param,
        url:window.location.href,
    }}, function(response) {
        console.log('got a response:');
        if(typeof response === 'undefined'){
            console.log('  undefined, error:',chrome.runtime.lastError);
        }else{
            console.log(response);
        }
    });
}


function init(){
    logger.log('init called in url:' + window.location.href);
    if(insideExtension){
        //on pages testing inzoom directly (via script src...) we can put in the head tag: 
        //<meta name="EnableInzoomExtension" content="false">
        //to disable the extension on these pages.
        let enableInzoomMeta =  l('meta[name="EnableInzoomExtension"]').attr('content');
        logger.log('enableInzoomMeta:',enableInzoomMeta);
        if(enableInzoomMeta === 'false' || enableInzoomMeta === '0'){
            logger.log('inzoom extension initing ABORTED, becase inside extension and EnableInzoomExtension set to false');
            return;
        }
    }
    logger.log('initing, inside extension: ', insideExtension);


    //if we are *not* inside an extension,  we'll change the default params for Config class
    let configParams = {};
    if(insideExtension){
        configParams = {
            storage : chrome.storage.local
        }        
    }else{
        configParams = {
            storage : null,//a dummy one 
            default : app.defaultConfig, //this one should come from src/common/app.js
        }
    }
    //note: config is being reread everytime user changes it in preferences.
    let config = new DotConfig(configParams);
    config.load(()=>{
        let iz = new Inzoom(config);
        iz.run();
    });

    //tests tests tests
    /*
    document.addEventListener('keydown', (event) => {
        if(event.key == '.' && event.altKey){
            console.log('inzoom internal test started...');
            
            //inzoomSendMessage('sent');
            //console.log(lAll('.addedAtRuntime'));
            //console.log(JSON.parse(JSON.stringify(document));
        }
    }, true);    
    */
}


if (document.readyState === "loading") {//might be 'loading' or 'complete'
	document.addEventListener("DOMContentLoaded", init, false);
} else {//dom already loaded (e.g. in case this script is called on document_end) so the above event will never fire, so:  
	init();
}


