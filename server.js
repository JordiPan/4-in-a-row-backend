import { Server } from 'socket.io';
import express from 'express';
import http from 'http';


const PORT = 3000;
const app = express();
const server = http.createServer(app);
const rooms = {};
const directions = [
  { row: 0, col: 1 },  // Horizontaal
  { row: 1, col: 0 },  // Verticaal
  { row: 1, col: 1 },  // Diagonaal (rechts)
  { row: 1, col: -1 }  // Diagonaal (links)
];

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
        leaveRoom(roomId, socket.id, socket);
      });
      console.log('user disconnected', socket.id);
    });

    socket.on('leaveRoom', (roomId, callback) => {
      leaveRoom(roomId);
      callback();
    });

    socket.on('createRoom', (creator, callback) => { 
      const roomId = generateRoomId();
      rooms[roomId] = {
        'creatorId': socket.id,
        'full': false, //werkt nog niet echt
        'board': createBoard(),
        'turn': {name: '', color: ''},
        // 'lastPlacement': [],
        'gameState': 0,
        'turnCount': 0,
        'players': [createPlayer(socket.id, creator)],
      };
      console.log('room created: ' + roomId);
      socket.join(roomId);
      callback(roomId, rooms[roomId]);
    });

    socket.on('rematch', (roomId) => {
      const room = rooms[roomId];
      room.board = createBoard();
      room.turnCount = 0;
      decideFirst(room);
      io.to(roomId).emit("rematch", room.turn.color);
    })
    //misschien ooit spectators in het systeem??
    socket.on('joinRoom', (roomId, username, callback) => {
      const room = rooms[roomId];
      if(room.full === true || !room) {
        callback(null)
        return;
      }
      room.players.push(createPlayer(socket.id, username));
      socket.join(roomId);
      console.log('user joined room');
      if (room.players.length >= 2) room.full = true;
      socket.to(roomId).emit("refresh", room, roomId);
      callback(rooms[roomId]);
    });

    socket.on('leaveRoom', (roomId) => {
      const room = rooms[roomId];
      console.log(socket.id+' left room: ' + roomId);
      leaveRoom(roomId, socket.id, socket);
      socket.to(roomId).emit("refresh", room, roomId);
    });

    socket.on('getRooms', (callback) => {
        console.log("sending rooms");
        callback(rooms);
    })

    socket.on('startGame', (roomId) => {
      let room = rooms[roomId];
      decideFirst(room);
      io.to(roomId).emit("startGame", room.turn.color);
    })
    //kolom vol kan gecheckt worden via board van OGH/client
    //geen callback nodig uiteindelijk
    socket.on('placeChip', (roomId, col, callback) => {
      let room = rooms[roomId];
      const state = placeChip(col, room, room.turn.color);
      callback(state);
      if(state !== 3) {
        if(state === 0){
          switchTurns(room);
        }
        io.to(roomId).emit("updateBoard", room);
      }
    })
});

function generateRoomId() {
  return Math.random().toString(21).toUpperCase().substring(4, 12);
}
//geen socketid nodig, gewoon socket 
function leaveRoom(roomId, socketId, socket) {
  const room = rooms[roomId];

  const playerIndex = room.players.findIndex(player => player.id === socketId);
  if (playerIndex >= 0) {
    socket.leave(roomId);
    room.full = false;
    room.players.splice(playerIndex, 1);

    if (room.players.length === 0) {
      delete rooms[roomId];
      console.log('room deleted: ' + roomId);
    }
  }
}

function createBoard() {
  let board = new Array(6);
  for (let i = 0; i < board.length; i++) {
    board[i] = new Array(7);
  }
  
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      board[row][col] = "";
    }
  }
  return board;
}

function createPlayer(id, username) {
  return {
    id,
    username,
    wins: 0
  }
}
function decideFirst(room) {
  const decider = Math.floor(Math.random() * (2 - 1 + 1)) + 1;
  if (decider == 1) {
    room.turn.color = 'blue';
    room.turn.name = room.players[0].username;
  } else {
    room.turn.color = 'red';
    room.turn.name = room.players[1].username;
  }
}
/* GAMESTATES RETURN
0=geen winnaar, ga door
1=gelijkspel
2=winnaar SPOTTED
3=kolom vol (kan liever anders opgelost worden)
*/
function placeChip(col, room, turnColor) {
  let board = room.board;
  for (let row = 5; row >= 0; row--) {
    if (board[row][col] === "") {
      board[row][col] = turnColor;  
      // room.lastPlacement = [row, col];
      
      return checkWinner(row, col, room);
    }
  }
  return 3;
}

function checkWinner(row, col, room) {
  for (let { row: dirRow, col: dirCol } of directions) {
    const forwardCount = counter(row, col, dirRow, dirCol, room);
    const backwardCount = counter(row, col, -dirRow, -dirCol, room);
    const count = forwardCount + backwardCount - 1;
    
    if (count >= 4) {
      addWin(room);
      room.gameState = 2;
      return room.gameState;
    }
  }

  room.turnCount += 1;
  if (room.turnCount === 42) {
    room.gameState = 1;
    return room.gameState;
  }

  room.gameState = 0;
  return room.gameState;
}

function counter(row, col, dirRow, dirCol, room) {
  let count = 0;
  while (
      row >= 0 && row < 6 &&
      col >= 0 && col < 7 &&
      room.board[row][col] === room.turn.color
  ) {
      
      count++;
      row += dirRow;
      col += dirCol;
    }
  return count;
}

function addWin(room) {
  if(room.turn.color === 'blue'){
    room.players[0].wins += 1; 
  }
  else {
    room.players[1].wins += 1; 
  }
}
function switchTurns(room) {
  if(room.turn.color === 'blue'){
    room.turn.color = 'red';
    room.turn.name = room.players[1].username;
  }
  else {
    room.turn.color = 'blue';
    room.turn.name = room.players[0].username;
  }
}

server.listen(PORT, () => {
    console.log('listening on port: ' + PORT);
  });