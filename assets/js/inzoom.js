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
        this.unit = null;
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

    /**
     * this function tries to find a target element (e.g. image) to zoom and then zoom it.
     * lElement - LightDom'ed(target);
     */ 
    zoomElement(lElement, deltaX, deltaY){
        //should we zoom IN or OUT
        let enlarge = deltaY < 0;
        let ratio = enlarge ? 1.1:0.9;
        //the simplest case
        if(lElement.is('img')){
            console.log('-------------zooming-----------------');
            let hElem = lElement[0];
            //is this the exactly same element as last time?
            let sameElementAsPreviously = this.lastElement === hElem;
            this.lastElement = hElem;

            let hParent = hElem.parentNode;
            let width = hElem.offsetWidth;
            let height = hElem.offsetHeight;
            console.log('offset width height:',width,height);
            
            
            let computedStyle = window.getComputedStyle(hElem);
            let parentComputedStyle = window.getComputedStyle(hParent);
            console.log('computedStyle:',computedStyle);
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
                let newWidth = width * ratio;
                let newHeight = height * ratio;
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

                //console.log('parent overflow:',parentComputedStyle['overflow']);
                if(parentComputedStyle['overflow'] === 'hidden'){
                    if(!sameElementAsPreviously){
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
        }
    }

    //wheel somewhere on the page (body)
    onWheel(event, delta, deltaX, deltaY){
        this.shiftKey = event.originalEvent.shiftKey;
        this.altKey = event.originalEvent.altKey;
        if(!this.shiftKey && !this.altKey){
            return;
        }
        event.originalEvent.preventDefault();
        this.zoomElement(l(event.target),deltaX,deltaY);
    }

    //click somewhere on the page (body)
    onClick(event){
        if(event.altKey){
            console.log('test (readonly) mode');
            this.testMode = true;
            this.zoomElement(l(event.target),0,1);
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