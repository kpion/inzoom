"use strict";

/*
this is the inzoom core. Included by extension (in manifest.json)
as well, as can be tested standalone in any page.
*/

//are we inside an extension or simply on a page as script src = '...'
let insideExtension = (
    typeof(browser) === 'object' || 
    (typeof chrome === 'object' && typeof chrome.extension === 'object'));



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
        this.lelement.css('cursor','move');
        this.lelement.on('mousedown', (event) => {
            if(event.button === 0){//left mouse button
                this.mouseIsDown = true;
            
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
    
    
    div  = document.querySelector('.inzoomMoveable');
    console.log('matrix:',getElementTransform(div));
    */
  
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

    //we'll use current mouse pointer to find all the elements under cursor to find out 
    //something which we can zoom in/out
    //root at first is simply 'document', then, when going recursive, it can change into something else
    //like a shadow element
    findElement2(root, point){
        let result = {
            type : null, //img, background-image
            lElement : null,
        };        
        //let elements = this.elementsFromPoint(event.clientX,event.clientY);
        let elements = root.elementsFromPoint(point.x, point.y); 
        for (var element of elements) {

            if(typeof element.shadowRoot !== 'undefined' && element.shadowRoot){
                console.log('found shadow!:',element.shadowRoot);
                //console.log(element.shadowRoot.elementsFromPoint(event.clientX,event.clientY));
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
        if(this.config.all().zoom.wheel.direction == '0'){
            enlarge = deltaY > 0;
        }else{
            enlarge = deltaY < 0;
        }
        let ratio = enlarge ? 1.1:0.9;

        let lElement = elementInfo.lElement;
            
        //restoring old style:
        setTimeout(()=>{
            if(typeof this.curElementStyle['outline'] !== 'undefined'){
                //lElement.css('outline',this.curElementStyle['outline']);
            }
        },600);

        //console.log('-------------zooming-----------------');
        //console.log('type: ' + elementInfo.type);

        let hElem = lElement[0];
        //is this the exactly same element as last time?
        let curElementChanged = (this.curElement !== hElem);
        this.curElement = hElem;
        if(curElementChanged){
            this.curElementStyle = {};
            Object.assign(this.curElementStyle,lElement[0].style);
            //lElement.css('outline','1px dotted blue');
        }    
        
        let hParent = hElem.parentNode;
        let elemWidth = hElem.offsetWidth;
        let elemHeight = hElem.offsetHeight;

        let computedStyle = window.getComputedStyle(hElem);
        //console.log('computedStyle: ',computedStyle);
        let parentComputedStyle = window.getComputedStyle(hParent);
        
        //should we move the element to the front (z-index)? 
        let moveElemToFront = false;
        
        if(!this.testMode){
            //this.transformElement(lElement,ratio);    
            let transform = computedStyle.transform;
            if(transform === '' || transform === 'none'){
                transform = 'matrix(1,0,0,1,0,0)';
            }         
            //hmmm it seems to work o.O and no - it doesn't accumulate, it's more like recalculated.   
            hElem.style.transform = transform + ` scale(${ratio},${ratio})`;
            //hElem.classList.add('inzoomMoveable');
            moveElemToFront = true;
        }            
       
        //console.log('parent overflow:',parentComputedStyle['overflow']);
        /*
        if(moveElemToFront && curElementChanged && !this.testMode){
            if(parentComputedStyle['overflow'] === 'hidden'){
                
                let zIndex = computedStyle['z-index'];
                if(zIndex === 'auto'){
                    zIndex = 0;
                }
                zIndex = this.lastZIndex + 1;
                this.lastZIndex = zIndex;
                lElement.css('z-index',zIndex);
                lElement.css('position','absolute');
            }        
        }
        */

        //moving elements (dragging) 
        if(!this.testMode && curElementChanged && this.config.all().dragging.enabled === true){
            if(typeof hElem.inzoomDraggableInstance === 'undefined'){
                hElem.inzoomDraggableInstance = new ElementDraggable(hElem);
            }
        }
    }

    findAndZoom(lElement, event, deltaX, deltaY){
        let found = this.findElement(lElement, new Point(event.clientX,event.clientY));
        if(found.lElement){
            this.zoomElement(found,deltaX, deltaY);
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
        //escape on "our" curElement? Then we'll undo our changes.
        if(event.keyCode == 27){
            let foundResult = this.findElement(null, this.mousePos);
            if(foundResult.lElement && foundResult.lElement[0] === this.curElement){
                //this will revert changes made by zooming and dragging.
                this.curElement.style.transform = this.curElementStyle.transform;                     
            }
        }
    }
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
    console.log('in zoom init called in url:' + window.location.href);
    if(insideExtension){
        //on pages testing inzoom directly (via script src...) we can put in the head tag: 
        //<meta name="EnableInzoomExtension" content="false">
        //to disable the extension on these pages.
        let enableInzoomMeta =  l('meta[name="EnableInzoomExtension"]').attr('content');
        console.log('enableInzoomMeta:',enableInzoomMeta);
        if(enableInzoomMeta === 'false' || enableInzoomMeta === '0'){
            console.log('inzoom extension initing ABORTED, becase inside extension and EnableInzoomExtension set to false');
            return;
        }
    }
    console.log('in zoom initing, inside extension: ', insideExtension);


    //if we are *not* inside an extension,  we'll change the default params for Config class
    let configParams = {};
    if(insideExtension){
        configParams = {
            storage : chrome.storage.local
        }        
    }else{
        configParams = {
            storage : null,//a dummy one 
            default : application.config, //this one should come from src/config/default.js
        }
    }
    //note: config is being reread everytime user changes it in preferences.
    let config = new DotConfig(configParams);
    config.load(()=>{
        let iz = new Inzoom(config);
        iz.run();
    });

    //tests tests tests
    
    document.addEventListener('keydown', (event) => {
        if(event.key == '.' && event.altKey){
            console.log('inzoom internal test started...');
            console.log('t2');
            //inzoomSendMessage('sent');
            //console.log(document.querySelectorAll('.addedAtRuntime'));
            //console.log(JSON.parse(JSON.stringify(document));
        }
    }, true);    
    
}

//in case this script is called on document_start:
document.addEventListener('DOMContentLoaded', init, false);
//in case this script is called on 'document_end' or injected on already existing tabs
if (document.readyState !== 'loading') {
    init();
}


