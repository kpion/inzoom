
function run(){
    //note: defaults were already loaded into storage on install.
    var config = new DotConfig({
        //if we're not in an extension - we'll give null as 'storage', so we can test other stuff, like css.
        //without errors 
        storage: typeof chrome.storage !== 'undefined' ? chrome.storage.local : null,
    });
    load();

    //string className  success or error
    function message(text, className){
        let lmsg = l('#config .message');
        lmsg.text(text);
        //for starters, removing all classes:
        lmsg[0].classList.remove('success','error');
        //now adding needed ones:
        lmsg[0].classList.add(className);
        
        if(text === ''){
            lmsg[0].classList.add('hidden');
        }else{
            lmsg[0].classList.add('msg-visible');
            if(className == 'success'){
                setTimeout(()=>{
                    lmsg[0].classList.remove('msg-visible');
                },1500)
            }
        }
        //lmsg[0].scrollIntoView();
    }

    function load(){
        config.load(()=>{
            l('form#config input').each(element => {
                if(element.type === 'checkbox'){
                    let check = config.get(element.name) != false;
                    //console.log('for ' + element.name + ' value is ' + config.get(element.name));
                    element.checked = check;
                }else if(element.type === 'text'){
                    element.value = config.get(element.name);
                }
            })
        });
    }

    function save() {
        l('form#config input').each(element => {
            if(element.type === 'checkbox'){
                let val = false;
                if(element.checked){
                    val = element.value == 'on' ? true : element.value;
                };
                config.set(element.name,val);
            }else if(element.type === 'text'){
                config.set(element.name,element.value);
            }
        })
        message('Saved','success');
    }
        
    document.querySelector("form#config").addEventListener("submit", event => {
        event.preventDefault();
        save();
    });	
    
}

window.addEventListener("DOMContentLoaded", function(){
    run();
});
    
	
