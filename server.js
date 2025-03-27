import { Server } from 'socket.io';
import express from 'express';
import http from 'http';


const PORT = 3000;
const app = express();
const server = http.createServer(app);
//moet object zijn voor dynamische toevoeging????
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
        // allowedHeaders: ["my-custom-header"]
    },
  });

  io.on('connection', (socket) => { 
    socket.emit('socketId', socket.id);
    console.log('a user connected: ' + socket.id);

    //disconnect events
    socket.on('disconnect', () => {      
      Object.keys(rooms).forEach(roomId => {
        leaveRoom(roomId, socket.id);
      });
      console.log('user disconnected', socket.id);

    });

    socket.on('leaveRoom', (roomId) => {
      leaveRoom(roomId);
    });

    socket.on('createRoom', (creator, callback) => { 
      const roomId = generateRoomId();
      rooms[roomId] = {
        'creatorId': socket.id,
        'full': false,
        'players': [{
          'id': socket.id, 
          'username': creator
        }],
      };
      console.log('room created: ' + roomId);
      callback(roomId, rooms[roomId]);
    });

    socket.on('test', (msg) => {
      console.log(msg);
    });

    //misschien ooit spectators in het systeem??
    socket.on('joinRoom', (roomId, username, callback) => {
      const room = rooms[roomId];
      if(room.full === true) {
        callback(null)
      }
      room.players.push({
          'id': socket.id,
          'username': username 
      });

      room.full = true;
      callback(rooms[roomId]);
    });

    socket.on('leaveRoom', (roomId) => {
        leaveRoom(roomId, socket.id);
        console.log('user left room: ' + roomId);
    });

    socket.on('getRooms', (callback) => {

        console.log("sending rooms: ",rooms);
        callback(rooms);
    })
});

function generateRoomId() {
  //Het quote niet als het begint met letter...
  return Math.random().toString(21).toUpperCase().substring(4, 12);
}

function leaveRoom(roomId, socketId) {
  const room = rooms[roomId];
  const playerIndex = room.players.findIndex(player => player.id === socketId);
  if (playerIndex >= 0) {
    room.full = false;
    room.players.splice(playerIndex, 1);
    console.log('user left room: ' + roomId);

    if (room.players.length === 0) {
      delete rooms[roomId];
      console.log('room deleted: ' + roomId);
    }
  }
}
server.listen(PORT, () => {
    console.log('listening on port: ' + PORT);
  });