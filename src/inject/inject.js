//document.body.style.backgroundColor = 'red';
/*
document.body.textContent = "";

var header = document.createElement('h1');
header.textContent = "This page has been eaten";
document.body.appendChild(header);
*/



function init(){
    //document.removeEventListener('DOMContentLoaded', init);
    //mouse.load();
    //console.log('init');
    //console.log(window.location.href);
    //document.body.style.backgroundColor = 'red';

}

//in case this script is called on document_start:
document.addEventListener('DOMContentLoaded', init, false);
//in case this script is called on 'document_end' or injected on already existing tabs
if (document.readyState !== 'loading') {
    //console.log('blah');
    init();
}
  