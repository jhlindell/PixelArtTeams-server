'use strict';

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const {
  getProjectsFromDatabase,
  sendProjectToDatabase,
  getProjectById,
  getIndexOfProject,
  setupNewGrid,
  addNewProject,
  sendFinishedProjectToDatabase,
  deleteUnfinishedProject,
  galleryArt,
  changePixel
} = require('./utilities');

const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')();
const bodyParser = require('body-parser');
const router = require('./router');
const axios = require('axios');
const cors = require('cors');
const winston = require('winston');
const Port = 8000;

// const allowedOrigins = ["https://pixelart-app.herokuapp.com/art", "https://pixelart-app.herokuapp.com/gallery", "https://pixelart-app.herokuapp.com/"];

const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: 'pixel.log' })
    ]
  });

io.set('origins', '*:*');
// io.set('match origin protocol', true);

// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, PATCH" );
//   res.header("Access-Control-Allow-Headers", "Content-Type");
//   if (req.method === "OPTIONS")
//     res.sendStatus(200);
//   else
//     next();
// });

app.use(cors());
app.use(bodyParser.json());
router(app);

getProjectsFromDatabase().then((allProjects) => {
  runProgram(allProjects);
});

const runProgram = (allProjects) => {
  io.on('connection', (socket) => {
    socket.on('joinRoom', (room) => {
      socket.join(room);
    });

    socket.on('leaveRoom', (room) => {
      socket.leave(room);
    });

    socket.on('grid', (room) =>{
      let index = getIndexOfProject(allProjects, room);
      socket.emit('gridUpdated', allProjects[index].grid);
    });

    socket.on('pixel', (pixel) => {
      changePixel(allProjects, pixel);
      io.in(pixel.project).emit('pixel', pixel);
    });

    socket.on('initialize', () => {
      socket.emit('sendProjectsToClient', allProjects);
    });

    socket.on('getArtForGallery', () => {
      galleryArt().then((result) => {
        socket.emit("sendingGallery", result);
      });
    });

    socket.on('addNewProject', (obj) => {
      addNewProject(allProjects, obj).then(() => {
        socket.emit('sendProjectsToClient', allProjects);
        socket.broadcast.emit('sendProjectsToClient', allProjects);
      })
    });

    socket.on('saveProject', (projectid) => {
      sendProjectToDatabase(allProjects, projectid).then(() => {
        socket.emit('sendProjectsToClient', allProjects);
        socket.broadcast.emit('sendProjectsToClient', allProjects);
      });
    });

    socket.on('deleteProject', (projectid) => {
      deleteUnfinishedProject(projectid).then(() => {
        let index = getIndexOfProject(projectid);
        allProjects.splice(index, 1);
        let firstProjectId = allProjects[0].project_id;
        socket.emit('changeCurrentProject', firstProjectId);
        socket.emit('sendProjectsToClient', allProjects);
        socket.broadcast.emit('sendProjectsToClient', allProjects);
      });
    })

    socket.on('sendFinishedProject', (projectid) => {
      sendProjectToDatabase(allProjects, projectid).then(() => {
        sendFinishedProjectToDatabase(allProjects, projectid).then(() => {
          let firstProjectId = allProjects[0].id;
          socket.emit('changeCurrentProject', firstProjectId);
          socket.emit('sendProjectsToClient', allProjects);
          socket.broadcast.emit('sendProjectsToClient', allProjects);
        });
      });
    });
  });

};

io.attach(server, {
	pingInterval: 10000,
	pingTimeout: 5000,
	cookie: false
});

//api server
server.listen(Port, () => {
  console.log("Now listening on port " + Port);
});

app.use((req, res, next) => {
  res.sendStatus(404);
});
