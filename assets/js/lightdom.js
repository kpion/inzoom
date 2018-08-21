/*
queryselector wrapper
https://github.com/kpion/lightdom
v. 1.0.0
*/
(function (window) {
 
    class LightDom extends Array{

        constructor(parameter = null, context = null) {
            super();
            this.context = context || document;
            this.add(parameter,context);
        }

        add(parameter, context = null){
            let nodes = null;//used only if adding from array / other LightDom instance
            if (typeof parameter === 'string' && parameter !== '') {
                //Object.assign(this, Array.from(this.context.querySelectorAll(parameter)));
                nodes = Array.from(this.context.querySelectorAll(parameter));
            } else if (parameter instanceof HTMLElement) {
                this.push (parameter);
            } else if (parameter instanceof NodeList || parameter instanceof HTMLCollection || parameter instanceof Array) {
                //Object.assign(this, Array.from(parameter));
                nodes = Array.from(parameter);
            } else if (parameter instanceof LightDom) {
                //copying ourselves to ourselves
                //Object.assign(this, parameter);
                nodes = parameter;
            }else{
                //acceptable in certain situations only, like calling e.g. l().setLogging(false);
            }
            if(nodes){//only if adding from array / other LightDom instance
                if(this.length === 0){
                    Object.assign(this, nodes);
                }else{
                    nodes.forEach(el => this.push(el));
                }
            }
            return this;
        }

        each(callback){
            this.forEach(callback);
            return this;
        }

        filter(parameter = null){
            if(parameter === null){
                return new LightDom(this);
            }
            if(typeof parameter === 'string'){
                return new LightDom(super.filter(el => el.matches(parameter)));
            }
            //must be a function:
            return new LightDom(super.filter(parameter));
            
        }

        is(parameter){
            return this.some(node => node.matches(parameter));
        }

        // Find all the nodes CHILDREN of the current ones, matched by a selector
        find (parameter) {
           let result = new LightDom();
           this.forEach(node => {
               result.add(node.querySelectorAll(parameter))
           })
           return result;
        };

        // Get parent of all nodes
        parent () {
            let result = new LightDom();
            this.forEach(node => {
                result.add(node.parentNode)
            })
            return result;
        };

        // Get closes (by selector) parent of all nodes
        closest (parameter) {
            let result = new LightDom();
            this.forEach(node => {
                while((node = node.parentNode) && (node !== document)){
                    if(node.matches (parameter)){
                        result.add(node);
                        break;
                    }
                }
            })
            return result;
        };

        css(property,val = null){
            if(val === null){
                return this[0] ? this[0].style[property] : null;
            }
            return this.each(node => {
                node.style[property] = val;
            })

        }

        attr(property,val = null){
            if(val === null){
                return this[0] ? this[0].getAttribute(property) : null;
            }
            return this.each(node => {
                node.setAttribute (property,val);
            })
        }       
        
        addClass(name){
            return this.each(node => {
                node.classList.add (name);
            })            
        }

        removeClass(name){
            return this.each(node => {
                node.classList.remove (name);
            })            
        }

        toggleClass(name){
            return this.each(node => {
                node.classList.toggle (name);
            })            
        }        

        html(val){
            if(val === null){
                return this[0] ? this[0].innerHTML : '';
            }
            return this.each(node => {
                node.innerHTML = val;
            })            
        }

        empty(){
            return this.html('');
        }

        text(val){
            if(val === null){
                return this[0] ? this[0].textContent : '';
            }
            return this.each(node => {
                node.textContent = val;
            })            
        }     

        insertAdjacentHTML(position, html){
            return this.each(node => {
                node.insertAdjacentHTML (position, html);
            })              
        }

        append(html){
            return this.insertAdjacentHTML ('beforeend', html);
        }

        prepend(html){
            return this.insertAdjacentHTML ('afterbegin', html);
        }

        before(html){
            return this.insertAdjacentHTML ('beforebegin', html);
        } 

        after(html){
            return this.insertAdjacentHTML ('afterend', html);
        }        

        on(type, callback, options = false){
            return this.each(node => {
                node.addEventListener(type, callback, options);
           });
        }
    }

    /////////
    //End of class Yes definition

    function lightdom(parameter, context = null) {
        return new LightDom(parameter, context);
    }


    //finally, it will be available under l:
    window.l = lightdom;


})(window);
