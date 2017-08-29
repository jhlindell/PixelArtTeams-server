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

//setup initial pixel grid for socket to track
var grid = setupNewGrid();

function setupNewGrid(){
  let  newGrid = [];
  for (var i = 0; i < 20; i++) {
    let row = [];
    for (var j = 0; j < 20; j++) {
      row.push('#FFF');
    }
    newGrid.push(row);
  }
  return newGrid;
}

function changePixel(pixel){
  grid[pixel.y][pixel.x] = pixel.color;
}

io.on('connection', (socket) => {
  // socket.on('room', (room)=> {
  //   socket.join(room);
  //   console.log('user joined room: ',room);
  // });

  //user requests the grid
  socket.on('grid', ()=>{
    socket.emit('gridUpdated', grid);
  });

  socket.on('pixel', (pixel)=> {
    changePixel(pixel);
    socket.emit('pixel', pixel);
    socket.broadcast.emit('pixel', pixel);
  });
});

io.listen(socketPort);
console.log("Now listening on port " + socketPort);

//api server
app.use(bodyParser.json());
app.use(cookieParser());

app.use('/api/users', users);

app.use((req, res, next) => {
  res.sendStatus(404);
});

app.listen(apiPort, () => {
  console.log("Now listening on port " + apiPort);
});
