'use strict';
console.log('starting background.js');
chrome.storage.local.set({color: '#3aa757'}, function() {
  //console.log("The color is green.");
});