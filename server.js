'use strict';

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const knex = require('./knex');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const users = require('./routes/users');
const projects = require('./routes/projects');
const axios = require('axios');
const apiPort = 8000;
const socketPort = 7000;

//setup initial pixel grid for socket to track
var allProjects = [];
getProjectsFromDatabase();


function getProjectsFromDatabase(){
  knex('projects')
    .select()
    .then((response) => {
      for(let i = 0; i < response.length; i++){
        let object = {};
        object.id = response[i].id;
        object.project_name = response[i].project_name;
        object.xsize = response[i].xsize;
        object.ysize = response[i].ysize;
        let grid;
        if(response[i].grid === ''){
          grid = setupNewGrid(object.xsize, object.ysize);
        } else {
          grid = JSON.parse(response[i].grid);
        }
        object.grid = grid;
        allProjects.push(object);
        console.log(allProjects.length);
      }
    })
    .catch(err => {
      console.log(err);
    });
}

async function sendProjectToDatabase(id){
  let project = getProjectById(id);
  let object = {};
  object.id = project.id;
  object.project_name = project.project_name;
  let gridString = JSON.stringify(project.grid);
  let convertedString = gridString.replace(/[\"]/g, "'");
  project.grid = convertedString;
  await knex('projects')
    .where('id', id)
    .update({grid: gridString, ysize: project.ysize, xsize: project.xsize})
    .catch(err => {
      console.log(err);
    })
    .then(() => {
      project.grid = JSON.parse(gridString);
    })
}

function getProjectById(id){
  for(let i = 0; i < allProjects.length; i++){
    if(allProjects[i].id === id){
      return allProjects[i];
    }
  }
}

function getIndexOfProject(id){
  for(let i = 0; i < allProjects.length; i++) {
    if(allProjects[i].id === id){
      return i;
    }
  }
}

function setupNewGrid(x=20, y=20){
  let  newGrid = [];
  for (var i = 0; i < y; i++) {
    let row = [];
    for (var j = 0; j < x; j++) {
      row.push('#FFF');
    }
    newGrid.push(row);
  }
  return newGrid;
}

async function addNewProject(obj){
  let newProject = {};
  newProject.project_name = obj.name;
  newProject.grid = '';
  newProject.ysize = obj.y;
  newProject.xsize = obj.x;

  await knex('projects')
    .insert(newProject)
    .returning("*")
    .then(result => {
      newProject.id = result[0].id;
      newProject.grid = setupNewGrid(obj.x, obj.y);
      allProjects.push(newProject);
    })
    .catch(err => {
      next(err);
    });
}

function sendFinishedProjectToDatabase(projectid){
  let project = getProjectById(projectid);
}

async function deleteUnfinishedProject(projectid){
  await knex('projects')
    .where('id', projectid)
    .delete()
    .returning('id')
    .then(result => {
      console.log('deleting: ', result);
    })
    .catch(err => {
      console.log(err);
    })
}

function changePixel(pixel){
  allProjects[getIndexOfProject(pixel.project)].grid[pixel.y][pixel.x] = pixel.color;
}

io.on('connection', (socket) => {
  socket.on('joinRoom', (room)=> {
    socket.join(room);
  });

  socket.on('leaveRoom', (room)=> {
    socket.leave(room);
  });

  socket.on('grid', (room)=>{
    let index = getIndexOfProject(room);
    socket.emit('gridUpdated', allProjects[index].grid);
  });

  socket.on('pixel', (pixel)=> {
    changePixel(pixel);
    io.in(pixel.project).emit('pixel', pixel);
  });

  socket.on('initialize', () => {
    socket.emit('sendProjectsToClient', allProjects);
  });

  socket.on('addNewProject', (obj)=> {
    addNewProject(obj).then(() => {
      socket.emit('sendProjectsToClient', allProjects);
    })
  });

  socket.on('saveProject', (projectid)=> {
    sendProjectToDatabase(projectid).then(()=> {
      socket.emit('sendProjectsToClient', allProjects);
    });
  });

  socket.on('deleteProject', (projectid)=> {
    deleteUnfinishedProject(projectid).then(() => {
      let index = getIndexOfProject(projectid);
      allProjects.splice(index,1);
      let firstProjectId = allProjects[0].id;
      socket.emit('changeCurrentProject', firstProjectId);
      socket.emit('sendProjectsToClient', allProjects);
    });
  })

  socket.on('sendFinishedProject', (projectid)=> {
    sendFinishedProjectToDatabase(projectid);
    socket.emit('sendProjectsToClient', allProjects);
  });

});

io.listen(socketPort);
console.log("Now listening on port " + socketPort);

//api server
app.use(bodyParser.json());
app.use(cookieParser());

app.use('/api/users', users);
app.use('/api/projects', projects);

app.use((req, res, next) => {
  res.sendStatus(404);
});

app.listen(apiPort, () => {
  console.log("Now listening on port " + apiPort);
});
