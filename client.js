// jshint browser:true, devel:true, strict:global, esversion:6
/* globals io */
'use strict';
var socket = null;
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
document.getElementById('input').addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();

  var textarea = document.getElementById('input');
  var text = textarea.value;
  textarea.value = '';
  handleInput(text);
});

// This whole thing is quick and dirty.
// Check out that unescaped user input.
var state = 'name input';
function handleInput(text) {
  switch (state) {
    case 'name input':
      output(`Hello ${text}`);
      output('Connecting...');
      socket = io('/squizit');
      wireUpHandlers(socket);
      break;
    case 'waiting for connect':
      output('Hold on, still trying to connect...');
      break;
    case 'room selection':
      output(`Attempting to join room ${text}...`);
      socket.emit('joinRoom', {roomId: text});
      state = 'waiting for join';
      break;
    case 'waiting for join':
      output('Hold on, still trying to join room...');
      break;
    case 'sentence entry':
      output('yeah the game\'s not working yet hold on');
      break;
  }
}

function wireUpHandlers(socket) {
  socket.on('connectionReply', function(data) {
    output('Connected! Available rooms:');
    for (let i = 0; i < data.rooms.length; ++i) {
      output(`Room #${data.rooms[i].roomId}: ${data.rooms[i].playerCount}/10`);
    }
    output('Which room do you want?');
    state = 'room selection';
  });

  socket.on('connectionRefused', function(data) {
    output('Couldn\'t join room. Did you enter the id correctly? Don\'t include the #.');
    // TODO DRY
    for (let i = 0; i < data.rooms.length; ++i) {
      output(`Room #${data.rooms[i].roomId}: ${data.rooms[i].playerCount}/10`);
    }
    output('Which room do you want?');
    state = 'room selection';
  });

  socket.on('roomJoined', function(data) {
    output(`Joined room ${data.roomId}.`);
    state = 'sentence entry';
  });

  socket.on('playerDisconnected', log('playerDisconnected'));
  socket.on('updatedRoomList', log('updatedRoomList'));
}
