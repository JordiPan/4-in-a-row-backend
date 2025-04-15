class Utils {
  static directions = [
    { row: 0, col: 1 }, // Horizontaal
    { row: 1, col: 0 }, // Verticaal
    { row: 1, col: 1 }, // Diagonaal (rechts)
    { row: 1, col: -1 }, // Diagonaal (links)
  ];

  generateRoomId() {
    return Math.random().toString(21).toUpperCase().substring(4, 12);
  }
  //geen socketid nodig, gewoon socket
  leaveRoom(roomId, socket, rooms) {
    const room = rooms[roomId];
    const id = socket.id;
    const playerIndex = room.players.findIndex(
      (player) => player.id === id
    );
    if (playerIndex >= 0) {
      socket.leave(roomId);
      room.full = false;
      room.players.splice(playerIndex, 1);

      if (room.players.length === 0) {
        delete rooms[roomId];
        console.log("room deleted: " + roomId);
      }
    }
  }

  createBoard() {
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

  createPlayer(id, username) {
    return {
      id,
      username,
      wins: 0,
    };
  }
  decideFirst(room) {
    const decider = Math.floor(Math.random() * (2 - 1 + 1)) + 1;
    if (decider == 1) {
      room.turn.color = "blue";
      room.turn.name = room.players[0].username;
    } else {
      room.turn.color = "red";
      room.turn.name = room.players[1].username;
    }
  }
  /* GAMESTATES RETURN
      0=geen winnaar, ga door
      1=gelijkspel
      2=winnaar SPOTTED
      3=kolom vol (kan liever anders opgelost worden)
      */
  placeChip(col, room, turnColor) {
    let board = room.board;
    for (let row = 5; row >= 0; row--) {
      if (board[row][col] === "") {
        board[row][col] = turnColor;
        
        return this.checkWinner(row, col, room);
      }
    }
    return 3;
  }

  checkWinner(row, col, room) {
    for (let { row: dirRow, col: dirCol } of Utils.directions) {
      const forwardCount = this.counter(row, col, dirRow, dirCol, room);
      const backwardCount = this.counter(row, col, -dirRow, -dirCol, room);
      const count = forwardCount + backwardCount - 1;

      if (count >= 4) {
        this.addWin(room);
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

  counter(row, col, dirRow, dirCol, room) {
    let count = 0;
    while (
      row >= 0 &&
      row < 6 &&
      col >= 0 &&
      col < 7 &&
      room.board[row][col] === room.turn.color
    ) {
      count++;
      row += dirRow;
      col += dirCol;
    }
    return count;
  }

  addWin(room) {
    if (room.turn.color === "blue") {
      room.players[0].wins += 1;
    } else {
      room.players[1].wins += 1;
    }
  }
  switchTurns(room) {
    if (room.turn.color === "blue") {
      room.turn.color = "red";
      room.turn.name = room.players[1].username;
    } else {
      room.turn.color = "blue";
      room.turn.name = room.players[0].username;
    }
  }
}
export default new Utils();