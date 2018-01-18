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
  changePixel,
  getUserProjectsArray
} = require('./utilities');

const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')();
const bodyParser = require('body-parser');
const router = require('./router');
const axios = require('axios');
const cors = require('cors');
const winston = require('winston');
const Port = process.env.PORT || 8000;

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

    socket.on('initialize', async (token) => {
      if(token){
        let projects = await getUserProjectsArray(allProjects, token);
        socket.emit('sendProjectsToClient', projects);
      } else {
        socket.emit('sendProjectsToClient', []);
      }
    });

    socket.on('getArtForGallery', () => {
      galleryArt().then((result) => {
        socket.emit("sendingGallery", result);
      });
    });

    socket.on('addNewProject', async (obj) => {
      let id = await addNewProject(allProjects, obj);
      let projects = await getUserProjectsArray(allProjects, obj.token);
      socket.emit('sendProjectsToClient', projects);
      socket.broadcast.emit('requestRefresh');
      socket.emit('changeCurrentProject', id);
    });

    socket.on('refreshProjects', async (token) => {
      let projects = await getUserProjectsArray(allProjects, token);
      socket.emit('sendProjectsToClient', projects);
    })

    socket.on('saveProject', (obj) => {
      sendProjectToDatabase(allProjects, obj.projectid).then( async() => {
        let projects = await getUserProjectsArray(allProjects, obj.token);
        socket.emit('sendProjectsToClient', projects);
        socket.broadcast.emit('requestRefresh');
      });
    });

    socket.on('deleteProject', (obj) => {
      deleteUnfinishedProject(obj.projectid).then( async() => {
        let index = getIndexOfProject(allProjects, obj.projectid);
        allProjects.splice(index, 1);
        let projects = await getUserProjectsArray(allProjects, obj.token);
        let firstProjectId = projects[0].project_id;
        socket.emit('changeCurrentProject', firstProjectId);
        socket.emit('sendProjectsToClient', projects);
        socket.broadcast.emit('requestRefresh');
      });
    })

    socket.on('sendFinishedProject', async (obj) => {
      await sendProjectToDatabase(allProjects, obj.projectid);
      await sendFinishedProjectToDatabase(allProjects, obj.projectid);
      let projects = await getUserProjectsArray(allProjects, obj.token);
      let firstProjectId = projects[0].project_id;
      socket.emit('changeCurrentProject', firstProjectId);
      socket.emit('sendProjectsToClient', projects);
      socket.broadcast.emit('requestRefresh');
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
