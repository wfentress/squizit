// Much of this code is taken from https://github.com/azurelogic/CakeRush/blob/master/controllers/cakerush.js
// jshint node:true, esversion:6
'use strict';
const MAX_PLAYERS = 10;
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var generateId = (function() {
  var count = 0;
  return function() {
    return ++count + '';
  };
})();

var rooms = [];
var generateRoom = function() {
  var room = {};
  room.id = generateId();
  room.players = [];
  return room;
};

// packs the room list and statistics onto the data message
function addRoomsToData(data) {
  // filter to only rooms that can accept a new player
  var availableRooms = rooms.filter(room => room.players.length < MAX_PLAYERS);

  // if no rooms are available, create a new one
  if (availableRooms.length === 0) {
    let newRoom = generateRoom();
    rooms.push(newRoom);
    availableRooms.push(newRoom);
  }

  // convert available rooms to just room id and player count
  // and attach to data message
  data.rooms = availableRooms.map((room, index) => ({
    roomId: room.id,
    roomIndex: index + 1,
    playerCount: room.players.length
  }));

  // check out lines 42-52 of
  // https://github.com/azurelogic/CakeRush/blob/master/controllers/cakerush.js
  // if you need more statistics here
}

// does the heavy lifting for leaving a room
function leaveRoom(roomToLeave, socket) {
  // check for null/undefined
  if (!roomToLeave) return;

  // remove the player from the room data
  roomToLeave.players = roomToLeave.players.filter(player => player.id !== socket.id);

  // if the room is now empty, remove it from the room list
  if (roomToLeave.players.length === 0) {
    rooms = rooms.filter(room => room.id !== roomToLeave.id);
  } else {
    // otherwise, notify other players in the room of the disconnection
    let output = {};
    output.playerId = socket.id;
    socket.broadcast.to(roomToLeave.id).emit('playerDisconnected', output);
  }

  // remove the player from the socket.io room
  socket.leave(roomToLeave.id);
}

app.use(express.static('.'));

io.of('/squizit').on('connection', function(socket) {
  console.log('user connected');
  socket.join('lobby');

  // send user their id and list of rooms
  var output = {};
  output.playerId = socket.id;
  addRoomsToData(output);
  socket.emit('connectionReply', output);

  // sends player an updated room list
  socket.on('getRooms', function() {
    var output = {};
    addRoomsToData(output);
    socket.emit('updatedRoomList', output);
  });

  // handle player disconnection
  socket.on('disconnect', function() {
    console.log('user disconnected');

    // find room being left
    var roomToLeave = rooms.find(room => {
      return room.players.some(player => player.id === socket.id);
    });

    // handle the rest of the disconnection
    leaveRoom(roomToLeave, socket);
  });

  // attempt to allow player to join room
  // on success, playerId is added to room and player is notified
  // on failure, player is notified
  socket.on('joinRoom', function(input) {
    // find the room being requested
    var room = rooms.find(room => room.id === input.roomId);

    // verify room can be joined: must exist and not be full
    if (!room || room.players.length >= MAX_PLAYERS) {
      let output = {};
      addRoomsToData(output);
      socket.emit('connectionRefused', output);
      return;
    }

    // register player with room
    room.players.push({id: socket.id, name: input.name, ready: false});
    socket.join(room.id);

    // send verification
    socket.emit('roomJoined', {roomId: room.id});
  });

  // handle player leaving room manually
  socket.on('leaveRoom', function(input) {
    var roomToLeave = rooms.find(room => room.id === input.roomId);
    leaveRoom(roomToLeave, socket);
  });
});

http.listen(8000, function() {
  console.log('listening on *:8000');
});

/*
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title></title>
</head>
<body>
  <h1>404 - Not Found</h1>
</body>
</html>
*/
