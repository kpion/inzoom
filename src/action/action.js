'use strict';


function run(){
    l('#openOptions').on('click',ev => {
        console.log('clicked');
        chrome.runtime.openOptionsPage(); 
    }) ;

    //whatever has the data-url attr makes it a link:
    l('[data-url]').on('click',ev => {
        var url = ev.target.getAttribute('data-url');
        chrome.tabs.create({'url': url});
    })

}
    
    
window.addEventListener("DOMContentLoaded", function(){
    run();
});
    