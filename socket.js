const io = require('socket.io')();
const {
  getProjectsFromDatabase,
  sendProjectToDatabase,
  sendFinishedProjectToDatabase,
  getProjectById,
  getIndexOfProject,
  addNewProject,
  setupNewGrid,
  deleteUnfinishedProject,
  galleryArt,
  changePixel
} = require('./routes/projects');
const {
  addUserPermission,
  checkForUser,
  getUserProjectsArray,
  getNameFromToken,
  getIdFromToken
} = require('./routes/users');

const winston = require('winston');
const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({ filename: 'pixel.log' })
  ]
});

io.on('connection', async (socket) => {
  const allProjects = await getProjectsFromDatabase();
  socket.on('joinRoom', (room) => {
    socket.join(room);
  });

  socket.on('leaveRoom', (room) => {
    socket.leave(room);
  });

  socket.on('grid', (room) =>{
    try{
      let index = getIndexOfProject(allProjects, room);
      socket.emit('gridUpdated', allProjects[index].grid);
    }
    catch(err){
      logger.error(err);
    }
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

  socket.on('addUserToProject', async (obj) => {
    let userId = await checkForUser(obj.username, obj.email);
    let result = await addUserPermission(userId, obj.projectid);
    socket.emit('resultOfAddingPermission', result);
  });

  socket.on('checkUser', async (obj) => {
    let userId = await checkForUser(obj.username, obj.email);
    if(userId){
      socket.emit("resultOfUserCheck", true);
    } else {
      socket.emit("resultOfUserCheck", false);
    }
  });

  socket.on('getUserName', (token) => {
    let username = getNameFromToken(token);
    socket.emit('returnUserName', username);
  })
});

module.exports = io;
