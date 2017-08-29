'use strict';

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const users = require('./routes/users');
const apiPort = 8000;
const socketPort = 7000;

app.use(bodyParser.json());
app.use(cookieParser());

app.use('/api/users', users);

app.use((req, res, next) => {
  res.sendStatus(404);
});

io.on('connection', (socket) => {
  // socket.on('room', (room)=> {
  //   socket.join(room);
  //   console.log('user joined room: ',room);
  // });
  socket.on('pixel', (pixel)=> {
    socket.emit('pixel', pixel);
    socket.broadcast.emit('pixel', pixel);
  })
});

io.listen(socketPort);
console.log("Now listening on port " + socketPort);

app.listen(apiPort, () => {
  console.log("Now listening on port " + apiPort);
});
