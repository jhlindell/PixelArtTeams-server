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
  sortRatedGallery,
  promoteProjectToPublic,
  galleryFlags
} = require('./routes/projects');

const {
  addUserPermission,
  checkForUser,
  getUserProjectsArray,
  getNameFromToken,
  getIdFromToken,
  getIdFromUsername,
  removeUserPermission,
  addPermissionsByList,
  checkForUserHash,
  verifyUser,
  resetPassword
} = require('./routes/users');

const {
  addRating,
  getRatingByUser,
  avgRating
} = require('./routes/ratings');

const {
  flagProject,
  checkIfUserFlagged
} = require('./routes/flags');

const {
  sendVerificationEmail,
  forgotUsername,
  resendVerificationEmail,
  passwordResetEmail
} = require('./routes/mail');

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
            logger.error(`can't get index of room: , ${room}`);
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

    socket.on('getArtForGallery', async (obj) => {
      let gallery = await galleryArt();
      let ratedGallery = await galleryRatings(gallery);
      let flaggedGallery = await galleryFlags(ratedGallery);
      let sortedGallery = await sortRatedGallery(flaggedGallery, obj.sortStyle, obj.token);
      socket.emit("sendingGallery", sortedGallery);
    });

    socket.on('getGalleryTop3', async () => {
      let gallery = await galleryArt();
      let ratedGallery = await galleryRatings(gallery);
      let flaggedGallery = await galleryFlags(ratedGallery);
      let sortedGallery = await sortRatedGallery(flaggedGallery, "rating");
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
      socket.emit('changeCurrentProject', id);
      socket.emit('addMessageToContainer', 'Project Added');
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
      });
    });

    socket.on('deleteProject', (obj) => {
      deleteUnfinishedProject(obj.projectid).then( async() => {
        let index = getIndexOfProject(allProjects, obj.projectid);
        allProjects.splice(index, 1);
        let projects = await getUserProjectsArray(allProjects, obj.token);
        socket.emit('changeCurrentProject', 0);
        socket.emit('sendProjectsToClient', projects);
        socket.broadcast.emit('projectClosedOut', obj.projectid);
        socket.emit('addMessageToContainer', 'Project Deleted');
      });
    })

    socket.on('sendFinishedProject', async (obj) => {
      await sendProjectToDatabase(allProjects, obj.projectid);
      await sendFinishedProjectToDatabase(allProjects, obj.projectid);
      let projects = await getUserProjectsArray(allProjects, obj.token);
      socket.emit('changeCurrentProject', 0);
      socket.emit('sendProjectsToClient', projects);
      socket.broadcast.emit('projectClosedOut', obj.projectid);
      socket.emit('addMessageToContainer', `Project Closed Out and Sent To Gallery`);
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
      let userinfo = getNameFromToken(token);
      socket.emit('returnUserName', userinfo);
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
    });

    socket.on('makeProjectPublic', async (id) => {
      let result = await promoteProjectToPublic(id);
      if(result){
        socket.emit('addMessageToContainer', result);
      } else {
        socket.emit('addMessageToContainer', result);
      }

    });

    socket.on('flaggingProject', async (obj) => {
      let userId = await getIdFromToken(obj.token);
      let flagResult = flagProject(userId, obj.projectId);
    });

    socket.on('didUserFlag', async (obj) => {
      let userId = await getIdFromToken(obj.token);
      let flagCheck = await checkIfUserFlagged(userId, obj.project_id);
      socket.emit('flagCheckResult', flagCheck);
    });

    socket.on('sendVerificationEmail', (obj) => {
      let result = sendVerificationEmail(obj.username, obj.email, obj.token);
      socket.emit('addMessageToContainer', result);
    });

    socket.on('checkForHash', async (hash) => {
      let hashCheckResult = false;
      let hashCheck = await checkForUserHash(hash);
      if(hashCheck){
        let verifyResult = await verifyUser(hashCheck);
        if(verifyResult){
          hashCheckResult = true;
        }
      }
      if(hashCheckResult){
        socket.emit('hashCheckResult', 'User Verified');
      } else {
        socket.emit('hashCheckResult', 'User Verification Failed');
      }
    });

    socket.on('forgotUsername', async (email) => {
      let result = await forgotUsername(email);
      socket.emit('addMessageToContainer', result);
    });

    socket.on('resendVerificationEmail', async (email) => {
      let result = await resendVerificationEmail(email);
      socket.emit('addMessageToContainer', result);
    });

    socket.on('passwordResetEmail', async (email) => {
      let result = await passwordResetEmail(email);
      socket.emit('addMessageToContainer', result);
    });

    socket.on('sendPasswordReset', async (obj) => {
      let result = await resetPassword(obj.password, obj.hash);
      socket.emit('addMessageToContainer', result);
    });

  });
}

module.exports = io;
