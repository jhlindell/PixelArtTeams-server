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
  changePixel,
  getProjectFromDbById,
  galleryRatings,
  sortRatedGallery
} = require('./routes/projects');

const {
  addUserPermission,
  checkForUser,
  getUserProjectsArray,
  getNameFromToken,
  getIdFromToken,
  getIdFromUsername,
  removeUserPermission,
  addPermissionsByList
} = require('./routes/users');

const {
  addRating,
  getRatingByUser,
  avgRating
} = require('./routes/ratings');

const winston = require('winston');
const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({ filename: 'pixel.log' })
  ]
});

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
      try{
        if(room !== 0){
          let index = getIndexOfProject(allProjects, room);
          if(index >= 0){
            socket.emit('gridUpdated', allProjects[index].grid);
          } else {
            console.log("can't get index of room: ", room);
          }
        }
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

    socket.on('getArtForGallery', async () => {
      let gallery = await galleryArt();
      let ratedGallery = await galleryRatings(gallery);
      let sortedGallery = sortRatedGallery(ratedGallery);
      socket.emit("sendingGallery", sortedGallery);
    });

    socket.on('getGalleryTop3', async () => {
      let gallery = await galleryArt();
      let ratedGallery = await galleryRatings(gallery);
      let sortedGallery = sortRatedGallery(ratedGallery);
      let top3 = [];
      for(let i = 0; i< 3; i++){
        if(sortedGallery[i]){
          top3.push(sortedGallery[i]);
        }
      }
      socket.emit('galleryTop3', top3);
    })

    socket.on('addNewProject', async (obj) => {
      let id = await addNewProject(allProjects, obj);
      await addPermissionsByList(id, obj.collaborators);
      let projects = await getUserProjectsArray(allProjects, obj.token);
      socket.emit('sendProjectsToClient', projects);
      socket.broadcast.emit('requestRefresh');
      socket.emit('changeCurrentProject', id);
    });

    socket.on('refreshProjects', async (token) => {
      if(token){
        let projects = await getUserProjectsArray(allProjects, token);
        socket.emit('sendProjectsToClient', projects);
      }
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

    socket.on('removeUserFromProject', async (obj) => {
      let id = await getIdFromUsername(obj.username);
      removeUserPermission(id, obj.projectid);
      socket.emit('userPermissionRemoved');
    });

    socket.on('checkUser', async (obj) => {
      let userId = await checkForUser(obj.username, obj.email);
      if(userId){
        socket.emit("resultOfUserCheck", { bool: true, username: obj.username });
      } else {
        socket.emit("resultOfUserCheck", false);
      }
    });

    socket.on('getUserName', (token) => {
      let username = getNameFromToken(token);
      socket.emit('returnUserName', username);
    });

    socket.on('getSingleProject', async(id) => {
      let project = await getProjectFromDbById(id);
      socket.emit('returnSingleProject', project);
    });

    socket.on('getUserRatingForProject', async(obj) => {
      let id = getIdFromToken(obj.token);
      let rating = await getRatingByUser(obj.project_id, id);
      socket.emit('returnUserRatingForProject', { rating, project_id: obj.project_id });
    });

    socket.on('changeUserRatingForProject', async(obj) => {
      let id = getIdFromToken(obj.token);
      let result = await addRating(id, obj.project_id, obj.rating);
      if(result !== -1){
        socket.emit('returnUserRatingForProject', { rating: result.rating, project_id: result.project_id })
      }
    });

    socket.on('getAvgRatingForProject', async(id) => {
      let rating = await avgRating(id);
      socket.emit('returnAvgRating', { rating, project_id: id });
    })
  });
}

module.exports = io;
