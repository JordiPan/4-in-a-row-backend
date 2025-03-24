import { Server } from 'socket.io';
import express from 'express';
import http from 'http';


const PORT = 3000;
const app = express();
const server = http.createServer(app);


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
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });

    socket.on('createRoom', (room, creator) => { 
        socket.join(room);
        console.log('room created: ' + room);
    });

    socket.on('test', (msg) => {
      console.log(msg);
    });

    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log('user joined room: ' + room);
    });

    socket.on('leaveRoom', (room) => {
        socket.leave(room);
        console.log('user left room: ' + room);
    });

    socket.on('getRooms', () => {
        const rooms = Object.keys(io.sockets.adapter.rooms);
        console.log("sending rooms: ",rooms);
        socket.emit('showRooms', rooms);
    })
});

server.listen(PORT, () => {
    console.log('listening on port: ' + PORT);
  });