// jshint browser:true, devel:true, strict:global, esversion:6
/* globals io */
'use strict';
var socket = null;
var myId = null;
var myName = null;
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
var escHTML = (function() {
  var div = document.createElement('div');
  return function(str) {
    div.textContent = str;
    return div.innerHTML;
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
var state = 'name input';
function handleInput(text) {
  switch (state) {
    case 'name input':
      output(`Hello ${escHTML(text)}`);
      myName = text;
      output('Connecting...');
      socket = io('/squizit');
      wireUpHandlers(socket);
      break;
    case 'waiting for connect':
      output('Hold on, still trying to connect...');
      break;
    case 'room selection':
      output(`Attempting to join room ${escHTML(text)}...`);
      socket.emit('joinRoom', {roomId: text, name: myName});
      state = 'waiting for join';
      break;
    case 'waiting for join':
      output('Hold on, still trying to join room...');
      break;
    case 'not ready':
      socket.emit('readyToStart', true);
      break;
    case 'ready':
      socket.emit('readyToStart', false);
      break;
    case 'sentence entry':
      socket.emit('sentence', text);
      break;
  }
}

function wireUpHandlers(socket) {
  socket.on('connectionReply', function(data) {
    output('Connected! Available rooms:');
    myId = data.playerId;
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

  socket.on('updatedRoomList', function(data) {
    if (state !== 'room selection') return;
    // TODO DRY
    for (let i = 0; i < data.rooms.length; ++i) {
      output(`Room #${data.rooms[i].roomId}: ${data.rooms[i].playerCount}/10`);
    }
    output('Which room do you want?');
  });

  socket.on('roomJoined', function(data) {
    output(`Joined room ${data.roomId}.`);
    output('Press Enter when you\'re ready to start.');
    state = 'not ready';
  });

  socket.on('readyStatus', function(data) {
    output(`${escHTML(data.name)} is ${data.ready ? '' : 'not '}ready to start.`);
    if (data.id === myId) {
      state = `${data.ready ? '' : 'not '}ready`;
    }
  });

  socket.on('startGame', function() {
    output('SQUIZIT START: Write the first sentence of a story!');
    state = 'sentence entry';
  });

  socket.on('sentence', function(sentence) {
    output('Continue this other story!');
    output(`<i>...${escHTML(sentence)}</i>`);
    state = 'sentence entry';
  });

  socket.on('story', function(story) {
    output('Here\'s the story you started:');
    output(escHTML(story.join(' ')));
    output('Press Enter when you\'re ready to go again.');
    state = 'not ready';
  });

  socket.on('playerDisconnected', log('playerDisconnected'));
}
