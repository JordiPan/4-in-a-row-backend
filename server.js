import { Server } from 'socket.io';
import express from 'express';
import http from 'http';
import Utils from './ServerUtils.js';

// TODO: reconnection met andere id 
const PORT = process.env.PORT || 3000;
const origin = process.env.PORT ? 'https://jordipan.github.io' : ['http://localhost:5500', 'http://127.0.0.1:5500'];
const app = express();
const server = http.createServer(app);
const rooms = {};

app.get('/', (req, res) => {
  res.send('<h1>aaaaaaaaaaaaaaaaaaaa</h1>');
});

const io = new Server(server, {
    cors: {
      origin: origin
    },
  });

  io.on('connection', (socket) => { 
    socket.emit('socketId', socket.id);
    console.log('a user connected: ' + socket.id);

    socket.on('disconnect', () => {      
      Object.keys(rooms).forEach(roomId => {
        const player = rooms[roomId].players.find((player) => {return player.id === socket.id});
        if(player) {
          Utils.leaveRoom(roomId, socket, rooms, io);
        }
      });
      console.log('user disconnected', socket.id);
    });

    socket.on('createRoom', (creator, callback) => { 
      const roomId = Utils.generateRoomId();
      rooms[roomId] = Utils.createRoom(socket.id, creator);
      console.log('room created: ' + roomId);
      socket.join(roomId);
      callback(roomId, rooms[roomId]);
    });

    socket.on('rematch', (roomId) => {
      const room = rooms[roomId];
      Utils.cleanGame(room);
      Utils.decideFirst(room);
      io.to(roomId).emit("rematch", room.turn.color, room.board);
    })
    //misschien ooit spectators in het systeem??
    socket.on('joinRoom', (roomId, username, callback) => {
      const room = rooms[roomId];
      if(!room || room.full === true) {
        callback(null)
        return;
      }
      room.players.push(Utils.createPlayer(socket.id, username));
      socket.join(roomId);
      console.log('user joined room');
      if (room.players.length >= 2) room.full = true;
      socket.to(roomId).emit("refresh", room, roomId);
      callback(rooms[roomId]);
    });

    socket.on('leaveRoom', (roomId, callback) => {
      console.log(socket.id + ' left room: ' + roomId);
      Utils.leaveRoom(roomId, socket, rooms, io);
      callback();
    });

    socket.on('getRooms', (callback) => {
        console.log("sending rooms");
        callback(rooms);
    })

    socket.on('startGame', (roomId) => {
      let room = rooms[roomId];
      Utils.cleanGame(room);
      Utils.decideFirst(room);
      io.to(roomId).emit("startGame", room.turn.color, room.board);
    })

    socket.on('placeChip', (roomId, col) => {
      let room = rooms[roomId];
      const state = Utils.placeChip(col, room, room.turn.color);
      if(state === 0) {
        Utils.switchTurns(room);
      }
      io.to(roomId).emit("updateBoard", room);
    })

    socket.on('stopGame', (roomId) => {
      const room = rooms[roomId];
      io.to(roomId).emit("refresh", room, roomId);
    })
});

server.listen(PORT, () => {
    console.log('listening on port: ' + PORT);
  });