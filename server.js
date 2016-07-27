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
    return ++count;
  };
})();

var rooms = [];
var generateRoom = function() {
  var room = {};
  room.id = generateId();
  room.playerIds = [];
  return room;
};

// packs the room list and statistics onto the data message
function addRoomsToData(data) {
  // filter to only rooms that can accept a new player
  var availableRooms = rooms.filter(room => room.playerIds.length < MAX_PLAYERS);

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
    playerCount: room.playerIds.length
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
  roomToLeave.playerIds = roomToLeave.playerIds.filter(id => id !== socket.id);

  // if the room is now empty, remove it from the room list
  if (roomToLeave.playerIds.length === 0) {
    rooms = rooms.filter(room => room.id !== roomToLeave.id);
  } else {
    // otherwise, notify other players in the room of the disconnection
    let data = {};
    data.playerId = socket.id;
    socket.broadcast.to(roomToLeave.id).emit('playerDisconnected', data);
  }

  // remove the player from the socket.io room
  socket.leave(roomToLeave.id);
}

app.use(express.static('.'));

io.of('/squizit').on('connection', function(socket) {
  console.log('user connected');

  // send user their id and list of rooms
  socket.on('playerConnect', function() {
    var data = {};
    data.playerId = socket.id;
    addRoomsToData(data);
    socket.emit('connectionReply', data);
  });

  // sends player an updated room list
  socket.on('getRooms', function() {
    var data = {};
    addRoomsToData(data);
    socket.emit('updatedRoomList', data);
  });

  // handle player disconnection
  socket.on('disconnect', function() {
    console.log('user disconnected');

    // find room being left
    var roomToLeave = rooms.find(room => {
      return room.playerIds.any(id => id === socket.id);
    });

    // handle the rest of the disconnection
    leaveRoom(roomToLeave, socket);
  });

  // attempt to allow player to join room
  // on success, playerId is added to room and player is notified
  // on failure, player is notified
  socket.on('joinRoom', function(data) {
    // find the room being requested
    var room = rooms.find(room => room.id === data.roomId);

    // verify room can be joined: must exist and not be full
    if (!room || room.playerIds.length >= MAX_PLAYERS) {
      socket.emit('connectionRefused');
      return;
    }

    // register player with room
    room.playerIds.push(socket.id);
    socket.join(room.id);

    // send verification
    socket.emit('roomJoined', {roomId: room.id});
  });

  // handle player leaving room manually
  socket.on('leaveRoom', function(data) {
    var roomToLeave = rooms.find(room => room.id === data.roomId);
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
