'use strict';


function run(){
    l('#openOptions').on('click',ev => {
        chrome.runtime.openOptionsPage(); 
        window.close();//closing this window (action popup)
    }) ;

    //whatever has the data-url attr makes it a link:
    l('[data-url]').on('click',ev => {
        ev.preventDefault();
        var url = ev.target.getAttribute('data-url');
        chrome.tabs.create({'url': url});
        window.close();//closing this window (action popup)
    })

}
    
    
window.addEventListener("DOMContentLoaded", function(){
    run();
});
    