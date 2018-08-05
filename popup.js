'use strict';

let changeColor = document.getElementById('changeColor');
console.log(chrome);
console.log(browser);
chrome.storage.local.get('color', function(data) {
  changeColor.style.backgroundColor = data.color;
  changeColor.setAttribute('value', data.color);
});
