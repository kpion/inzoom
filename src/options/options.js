
function run(){
    var logger = new Logger('inzoom options: ', app.isDev());

    let form = document.querySelector("form#config")
    //note: defaults were already loaded into storage on install.
    var config = new DotConfig({
        //if we're not in an extension - we'll give null as 'storage', so we can test other stuff, like css.
        //without errors 
        storage: typeof chrome.storage !== 'undefined' ? chrome.storage.local : null,
        autoSave: false,
    });
    
    if(app.isDev()){
        l('.onlyInDev').each(el => {
            el.style.display = 'block';
        });
    }
    build();//stuff like preparing selects with keyboard shortcuts.
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
                    //logger.log('for ' + element.name + ' value is ' + config.get(element.name));
                    let check = config.get(element.name, false) != false;
                    element.checked = check;
                }else if(element.type === 'text'){
                    element.value = config.get(element.name);
                }
            });
            //special case for selects
            l('form#config select').each(element => {
                element.value = config.get(element.name);
            })            
        });
    }

    function save(showMessage = false) {
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
        //special case for selects
        l('form#config select').each(element => {
            //element.value = config.get(element.name);
            config.set(element.name,element.value);
        })              
        config.save(()=>{
            logger.log('form saved');
            if(showMessage){
                message('Saved','success');
            }
        });
    }
    
    //stuff like preparing selects with keyboard shortcuts.
    function build(){
        l('.keyboard-keys').each(select => {
            feedKeyboardShortcutSelect(select);
        });       
    }

    function feedKeyboardShortcutSelect(selectElement){
        //const select = document.querySelector(selector);
        function add(code, text){
            const opt = document.createElement("option");  
            opt.value = code;
            opt.textContent = text;
            selectElement.appendChild(opt);    
        }
        //letters
        for (code = 65;code < 65+26; code++){
            add(code,String.fromCharCode(code));
        }
        //digits
        for (code = 48;code < 48+10; code++){
            add(code,String.fromCharCode(code));
        }
        //special
        add(13,'Enter');
        add(32,'Space');
        add(9,'Tab');
        add(8,'Backspace');
        
        add(45,'Insert');
        add(46,'Delete');
        add(36,'Home');
        add(35,'End');
        add(33,'Page up');
        add(34,'Page down');
        
        add(188,',');
        add(190,',');
        
        add(219,'[');
        add(221,']');
        add(189,'-');
        add(187,'=');
    }

    document.querySelector("form#config").addEventListener("submit", event => {
        event.preventDefault();
        save(true);
    });	

    form.addEventListener("change", function () {
        //logger.log("Form has changed! change");
        //works but... hmm...
        save();
    });    
}

window.addEventListener("DOMContentLoaded", function(){
    run();
});
    
	
