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
var allProjects = [];
addNewProject();
addNewProject();
addNewProject();

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

function addNewProject(){
  let newProject = {};
  newProject.id = allProjects.length + 1;
  newProject.grid = setupNewGrid();
  allProjects.push(newProject);
}

function changePixel(pixel){

  allProjects[pixel.project-1].grid[pixel.y][pixel.x] = pixel.color;
  // console.log(allProjects[pixel.project-1]);
}

io.on('connection', (socket) => {
  socket.on('joinRoom', (room)=> {
    socket.join(room);
  });

  socket.on('leaveRoom', (room)=> {
    socket.leave(room);
  });

  //user requests the grid
  socket.on('grid', (room)=>{
    socket.emit('gridUpdated', allProjects[room-1].grid);
  });

  socket.on('pixel', (pixel)=> {
    changePixel(pixel);
    io.in(pixel.project).emit('pixel', pixel);
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
