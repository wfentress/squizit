// jshint browser:true, devel:true, strict:global, esversion:6
/* globals io */
'use strict';
var socket = io('/squizit');
var log = function(str) {
  return function(data) {
    console.log(str, data);
  };
};
var output = (function() {
  var outUl = document.getElementById('output');
  return function(data) {
    var newLi = document.createElement('li');
    newLi.innerHTML = data;
    outUl.appendChild(newLi);
    outUl.scrollTop = outUl.scrollHeight;
  };
})();
socket.on('playerDisconnected', log('playerDisconnected'));
socket.on('connectionReply', log('connectionReply'));
socket.on('updatedRoomList', log('updatedRoomList'));
socket.on('connectionRefused', log('connectionRefused'));
socket.on('roomJoined', log('roomJoined'));
document.getElementById('input').addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();

  var textarea = document.getElementById('input');
  var text = textarea.value;
  textarea.value = '';
  handleInput(text);
});

var state = 'name input';
function handleInput(text) {
  switch (state) {
    case 'name input':
      output(`Hello ${text}`);
      break;
  }
}
