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

// Handle a socket connection request from web client
const connections = [null, null];
io.on('connection', (socket) => {
  // a socket is the actual client that is connecting
  // console.log('New Web Socket connection');
  // find an available player number
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] === null) {
      playerIndex = i;
      break;
    }
  }

  // tell the connecting client what player number they are
  socket.emit('player-number', playerIndex);
  console.log(`Player ${parseInt(playerIndex) + 1} has connected`);

  // ignore player 3 or more
  if (playerIndex === -1) return;

  connections[playerIndex] = false; // to keep track of whether the player is ready or not - the player is not ready initiially

  // tell everyone what player number just connected
  socket.broadcast.emit('player-connection', playerIndex);

  // handle disconnect
  socket.on('disconnect', () => {
    console.log(`Player ${parseInt(playerIndex) + 1} disconnected`);
    connections[playerIndex] = null;
    // tell everyone what player number just disconnected
    socket.broadcast.emit('player-connection', playerIndex);
  });

  // when a player is ready
  socket.on('player-ready', () => {
    socket.broadcast.emit('enemy-ready', playerIndex); // broadcast to the other players that an enemy is ready
    connections[playerIndex] = true; // because that player is now ready
  });

  // check player connections
  socket.on('check-players', () => {
    const players = [];
    for (const i in connections) {
      connections[i] === null
        ? players.push({ connected: false, ready: false })
        : players.push({ connected: true, ready: connections[i] });
    }
    socket.emit('check-players', players);
  });
});
