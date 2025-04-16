import { Server } from 'socket.io';
import express from 'express';
import http from 'http';
import Utils from './Utils.js';

// als disconnect in game: 
// verander disconnect in server side zodat het de andere dude in de room emit dat guy weg is. 
// stuur dude terug naar waiting room via refresh
// misschien ook cleanup voor promises die bezig zijn
const PORT = 3000;
const app = express();
const server = http.createServer(app);
const rooms = {};


app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:5500');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


app.get('/', (req, res) => {
  res.send('<h1>aaaaaaaaaaaaaaaaaaaa</h1>');
});

const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
        methods: ["GET", "POST"],
    },
  });

  io.on('connection', (socket) => { 
    socket.emit('socketId', socket.id);
    console.log('a user connected: ' + socket.id);

    socket.on('disconnect', () => {      
      Object.keys(rooms).forEach(roomId => {
        Utils.leaveRoom(roomId, socket, rooms);
      });
      console.log('user disconnected', socket.id);
    });

    socket.on('createRoom', (creator, callback) => { 
      const roomId = Utils.generateRoomId();
      rooms[roomId] = {
        'creatorId': socket.id,
        'full': false, //werkt nog niet echt
        'board': null,
        'turn': {name: '', color: ''},
        'gameState': 0,
        'turnCount': 0,
        'players': [Utils.createPlayer(socket.id, creator)],
      };
      console.log('room created: ' + roomId);
      socket.join(roomId);
      callback(roomId, rooms[roomId]);
    });

    socket.on('rematch', (roomId) => {
      const room = rooms[roomId];
      Utils.cleanGame(room);
      Utils.decideFirst(room);
      io.to(roomId).emit("rematch", room.turn.color);
    })
    //misschien ooit spectators in het systeem??
    socket.on('joinRoom', (roomId, username, callback) => {
      const room = rooms[roomId];
      if(room.full === true || !room) {
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
      Utils.leaveRoom(roomId, socket, rooms);
      callback();
      console.log(socket.id+' left room: ' + roomId);

      if(rooms[roomId]) {
        const room = rooms[roomId];
        socket.to(roomId).emit("refresh", room, roomId);
      }
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