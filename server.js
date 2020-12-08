const express = require('express');
const path = require('path');
const http = require('http');
const PORT = process.env.PORT || 3000;
const socketio = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketio(server); // this is our socketio server

// Set our static folder (public) that the server will serve to the client
app.use(express.static(path.join(__dirname, 'public')));

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle a socket connection request from a web client
const connections = [null, null]; // two players
io.on('connection', (socket) => {
  // a socket is the actual client that is connecting
  // find an available player number (either 0 or 1)
  let playerIndex = -1; // default is -1, indicating there is no spot
  for (const i in connections) {
    if (connections[i] === null) {
      playerIndex = i;
      break;
    }
  }

  // tell the connecting client what player number he/she is
  socket.emit('player-number', playerIndex);
  console.log(`Player ${parseInt(playerIndex) + 1} has connected`);

  // ignore player 3 or more
  if (playerIndex === -1) return;

  connections[playerIndex] = false; // to keep track of whether the player is ready or not - the player is not ready initiially, hence 'false'

  // tell everyone what player number just connected
  socket.broadcast.emit('player-connected', playerIndex);

  // handle disconnect
  socket.on('disconnect', () => {
    console.log(`Player ${parseInt(playerIndex) + 1} disconnected`);
    connections[playerIndex] = null;
    // tell everyone what player number just disconnected
    socket.broadcast.emit('player-disconnected', playerIndex);
  });

  // when a player is ready
  socket.on('player-ready', () => {
    socket.broadcast.emit('enemy-ready', playerIndex); // broadcast to the other player that his/her enemy is ready
    connections[playerIndex] = true; // because that player is now ready
  });

  // check player connections' status
  socket.on('check-players', () => {
    const players = [];
    for (const i in connections) {
      connections[i] === null
        ? players.push({ connected: false, ready: false })
        : players.push({ connected: true, ready: connections[i] });
    }
    socket.emit('check-players', players);
  });

  // on fire received
  socket.on('fire', (id) => {
    console.log(
      `Shot fired from player ${parseInt(playerIndex) + 1} on square ${id}`
    );
    // emit the move to the other player
    socket.broadcast.emit('fire', id);
  });

  // on fire reply
  socket.on('fire-reply', (square) => {
    console.log('fire reply for square', square);
    // forward the replay to
    socket.broadcast.emit('fire-reply', square);
  });
});
