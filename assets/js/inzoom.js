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


class Inzoom{

    constructor(){
        //recently modified element (HTMLElement)
        this.lastElement = null;
        //last element style *copied* before doing anything.
        this.lastElementStyle = null;
        //recently used zindex, so... the next one in the next element selected will be higher:)
        this.lastZIndex = 0;

        this.shiftKey = this.altKey = null;
        this.testMode = false;
    }

    run(){
        let hamsterTarget = document.body;
        Hamster(hamsterTarget).wheel((...params) => this.onWheel(...params));
        document.body.addEventListener('click',event => this.onClick(event));
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
        if(result.type === null) {
            let computedStyle = window.getComputedStyle(hElem);
            console.log('cs: ',computedStyle['backgroundImage']);
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
    */
    findElement(lElement, event){
        //this metod will get what we understand we have in the element
        //return example:
        //{
           //type : null, //img, background-image
           //lElement : null,
        //};        
        let result = this.getElementInfo(lElement);

        //if nothing recognized, we'll use current mouse pointer to find all the elements under cursor to find out 
        //something which we can zoom in/out
        if(result.type === null){
            //let elements = this.elementsFromPoint(event.clientX,event.clientY);
            let elements = document.elementsFromPoint(event.clientX,event.clientY);
            for (var element of elements) {
                result = this.getElementInfo(l(element));
                if(result.type !== null){
                    break;
                }
            }            
            console.log('all elements:',elements);
        }
        return result;
    }

    /*
    modifies element's transform:matrix - used by zoomElement
    */
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
    /**
     
     * elementInfo - elementInfo  to work on, Usually found with this.findElement
     */ 
    zoomElement(elementInfo, deltaX, deltaY){
        //should we zoom IN or OUT
        let enlarge = deltaY < 0;
        let ratio = enlarge ? 1.1:0.9;

        let lElement = elementInfo.lElement;
            
        //restoring old style:
        setTimeout(()=>{
            if(typeof this.lastElementStyle['outline'] !== 'undefined'){
                lElement.css('outline',this.lastElementStyle['outline']);
            }
        },2000);

        console.log('-------------zooming-----------------');
        console.log('type: ' + elementInfo.type);
        let hElem = lElement[0];
        //is this the exactly same element as last time?
        let sameElementAsPreviously = this.lastElement === hElem;
        this.lastElement = hElem;
        if(!sameElementAsPreviously){
            this.lastElementStyle = {};
            Object.assign(this.lastElementStyle,lElement[0].style);
            
        }    
        
        let hParent = hElem.parentNode;
        let elemWidth = hElem.offsetWidth;
        let elemHeight = hElem.offsetHeight;
        console.log('offset width height:', elemWidth, elemHeight);

        let computedStyle = window.getComputedStyle(hElem);
        //console.log('computedStyle: ',computedStyle);
        let parentComputedStyle = window.getComputedStyle(hParent);
        
        //should we move the element to the front (z-index)? 
        let moveElemToFront = false;
        
        if(!this.testMode){
            this.transformElement(lElement,ratio);    
            moveElemToFront = true;
        }            
        /*
        //old but might still be usefull, maybe...
        //the simplest case
        if(elementInfo.type === 'img'){
            moveElemToFront = true;
            lElement.css('outline','2px dotted rgba(255,50,0,1)');
            //console.log('computedStyle:',computedStyle);
            //console.log('computed maxwidth:',computedStyle.maxWidth);

            //here it's better to use computedStyle, it respects not only inline style but also css
            //let maxWidth = lElement.css('max-width') || false;
            //let maxHeight = lElement.css('max-height') || false;        
            let maxWidth = null, maxHeight = null;
            if(computedStyle.maxWidth && computedStyle.maxWidth !== 'none'){
                maxWidth = computedStyle.maxWidth; 
            }
            if(computedStyle.maxHeight && computedStyle.maxHeight !== 'none'){
                maxHeight = computedStyle.maxHeight; 
            }        
            
            console.log('maxwidth maxheight:',maxWidth, maxHeight);
            //
            let bodyRect = document.body.getBoundingClientRect(),
            elemRect = hElem.getBoundingClientRect(),
            offsetY   = elemRect.top - bodyRect.top;
            console.log('rect:', elemRect);
            console.log('offsetY:', offsetY);

            //////////
            //actual modification
            if(!this.testMode){
                
                let newWidth = elemWidth * ratio;
                let newHeight = elemHeight * ratio;
                lElement.css('width', newWidth + 'px');
                lElement.css('height', newHeight + 'px');

                if(maxWidth){
                    //yeah, doing this is weird, but works in most cases.
                    let nu = new NumberUnit(maxWidth);
                    nu.value *= ratio;
                    lElement.css('max-width', nu.combine());
                }
                if(maxHeight){
                    let nu = new NumberUnit(maxHeight);
                    nu.value *= ratio;
                    lElement.css('max-height', nu.combine());
                }


            }
        }

 
        if(elementInfo.type === 'background-image'){
            
            moveElemToFront = true;
            

            lElement.css('outline','2px dotted rgba(50,255,0,1)');
            //actual modification
            if(!this.testMode){
                this.transformElement(lElement,ratio);
                return;
                //resizing the element itself:
                let newWidth = elemWidth * ratio;
                let newHeight = elemHeight * ratio;
                lElement.css('width', newWidth + 'px');
                lElement.css('height', newHeight + 'px');
                //resising the image inside:
                console.log(computedStyle);
                //backgroundSize - by default is 'auto'
                
                let backgroundSize = computedStyle['backgroundSize'];
                //if 'auto' then the above container change should be enough, otherwise:
                //if(backgroundSize !== 'auto')
                {
                    if(backgroundSize === 'auto'){
                        backgroundSize = '100% 100%';//not tested trick
                    }
                    console.log('backgroundSize:',backgroundSize);
                    let arBackgroundSize = backgroundSize.split(' ');
                    if(arBackgroundSize.length == 2){
                        console.log('arBackgroundSize:',arBackgroundSize);
                        let bkgWidth = new NumberUnit(arBackgroundSize[0]);
                        let bkgHeight = new NumberUnit(arBackgroundSize[1]);
                        bkgWidth.value *= ratio;
                        bkgHeight.value *= ratio;
                        let newBackgroundSize = bkgWidth.combine() + ' ' + bkgHeight.combine();
                        console.log('new size: ', newBackgroundSize);
                        lElement.css('background-size', newBackgroundSize);
                    }
                }
            }
        }        
        */
        //console.log('parent overflow:',parentComputedStyle['overflow']);
        if(moveElemToFront && !sameElementAsPreviously && !this.testMode){
            if(parentComputedStyle['overflow'] === 'hidden'){
                
                console.log('new element');
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
    }

    findAndZoom(lElement, event, deltaX, deltaY){
        let found = this.findElement(lElement, event);
        if(found.lElement){
            this.zoomElement(found,deltaX, deltaY);
        }
    }

    //wheel somewhere on the page (body)
    onWheel(event, delta, deltaX, deltaY){
        this.shiftKey = event.originalEvent.shiftKey;
        this.altKey = event.originalEvent.altKey;
        if(!this.shiftKey && !this.altKey){
            return;
        }
        console.log('ev:',event);
        event.originalEvent.preventDefault();
        this.findAndZoom(l(event.target),event.originalEvent,deltaX,deltaY);
    }

    //click somewhere on the page (body)
    onClick(event){
        if(event.altKey){
            console.log('test (readonly) mode');
            console.log('ev:',event);
            this.testMode = true;
            this.findAndZoom(l(event.target),event,0,1);
            this.testMode = false;
        }
    }
}



function init(){
    if(insideExtension){
        //on pages testing inzoom directly (via script src...) we can put in the head tag: 
        //<meta name="EnableInzoomExtension" content="false">
        //to disable the extension on these pages.
        let enableInzoomMeta =  l('meta[name="EnableInzoomExtension"]').attr('content');
        console.log('enableInzoomMeta:',enableInzoomMeta);
        if(enableInzoomMeta === 'false' || enableInzoomMeta === '0'){
            console.log('in zoom extension initing ABORTED, becase inside extension and EnableInzoomExtension set to false');
            return;
        }
    }
    console.log('in zoom initing, inside extension: ',insideExtension);
    let iz = new Inzoom();
    iz.run();
}

//in case this script is called on document_start:
document.addEventListener('DOMContentLoaded', init, false);
//in case this script is called on 'document_end' or injected on already existing tabs
if (document.readyState !== 'loading') {
    //console.log('blah');
    init();
}