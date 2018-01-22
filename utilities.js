const knex = require('./knex');
const winston = require('winston');
const jwt = require('jwt-simple');
require('dotenv').config();
const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: 'pixel.log' })
    ]
  });

function getProjectsFromDatabase() {
  return knex('projects')
    .select()
    .where('is_finished', false)
    .then((response) => {
      let projectArray = [];
      for(let i = 0; i < response.length; i++){
        let object = {};
        object.project_id = response[i].project_id;
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
        projectArray.push(object);
      }
      return projectArray;
    })
    .catch(err => {
      logger.error(err);
    });
}

function getUserProjectsArray(projectsArray, token){
  let decodedToken = jwt.decode(token, process.env.JWT_KEY);
  let id = decodedToken.sub;
  let projectIndexArray = [];
  let userProjectsArray = [];
  return knex('users_projects')
    .where('user_id', id)
    .returning('project_id')
    .catch(err => {
      logger.error(err);
    })
    .then((response) => {
      response.forEach(function(object){
        projectIndexArray.push(object.project_id)
      })
      projectsArray.forEach(function(project){
        projectIndexArray.forEach(function(index){
          if(project.project_id === index){
            userProjectsArray.push(project);
          }
        })
      })
      return userProjectsArray;
    })
}

async function sendProjectToDatabase(projectsArray, id){
  let project = getProjectById(projectsArray, id);
  let gridString = JSON.stringify(project.grid);
  let convertedString = gridString.replace(/[\"]/g, "'");
  project.grid = convertedString;
  await knex('projects')
    .where('project_id', id)
    .update({grid: gridString, ysize: project.ysize, xsize: project.xsize})
    .catch(err => {
      logger.error(err);
    })
    .then(() => {
      project.grid = JSON.parse(gridString);
    })
}

function getProjectById(projectsArray, id){
  for(let i = 0; i < projectsArray.length; i++){
    if(projectsArray[i].project_id === id){
      return projectsArray[i];
    }
  }
}

function getIndexOfProject(projectsArray, id){
  for(let i = 0; i < projectsArray.length; i++) {
    if(projectsArray[i].project_id === id){
      return i;
    }
  }
  return -1;
}

function setupNewGrid(x=20, y=20){
  if(x < 1 || y < 1){
    return [];
  }
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

async function addNewProject(projectsArray, obj){
  let decodedToken = jwt.decode(obj.token, process.env.JWT_KEY);
  let owner_id = decodedToken.sub;
  let newProject = {};
  newProject.project_owner = owner_id;
  newProject.project_name = obj.name;
  newProject.grid = '';
  newProject.ysize = obj.y;
  newProject.xsize = obj.x;

  await knex('projects')
    .insert(newProject)
    .returning("*")
    .then(result => {
      newProject.project_id = result[0].project_id;
      newProject.grid = setupNewGrid(obj.x, obj.y);
      projectsArray.push(newProject);
    })
    .catch(err => {
      logger.error(err);
    });

  await knex('users_projects')
    .insert({ user_id: owner_id, project_id: newProject.project_id })
    .returning('*')
    .then(result => {
      // console.log(result)
    })
    .catch(err => {
      logger.error(err);
    });

  return newProject.project_id;
}

async function sendFinishedProjectToDatabase(projectsArray, projectid){
  let project = getProjectById(projectsArray, projectid);
  let index = getIndexOfProject(projectsArray, projectid);
  await knex('projects')
  .where('project_id', project.project_id)
  .update({is_finished: true})
  .catch(err => {
    logger.error(err);
  })
  .then(() => {
    projectsArray.splice(index, 1);
    return projectsArray;
  })
}

async function deleteUnfinishedProject(projectid){
  await knex('projects')
    .where('project_id', projectid)
    .delete()
    .returning('project_id')
    .then(result => {
      logger.info('deleting: ', result);
      return result;
    })
    .catch(err => {
      logger.error(err);
    })
}

async function galleryArt() {
  let gallery = [];
  return await knex('projects')
  .select()
  .where('is_finished', true)
  .then((response) => {
    for(let i = 0; i < response.length; i++){
      let object = {};
      object.project_id = response[i].project_id;
      object.project_name = response[i].project_name;
      object.xsize = response[i].xsize;
      object.ysize = response[i].ysize;
      let grid;
      debugger;
      grid = JSON.parse(response[i].grid);
      object.grid = grid;
      gallery.push(object);
    }
    return gallery;
  })
  .catch(err => {
    logger.error(err);
  });

}

function changePixel(projectsArray, pixel){
  try {
    let index = getIndexOfProject(projectsArray, pixel.project);
    if(index === -1) {
      throw 'project index not found';
    } else {
      projectsArray[index].grid[pixel.y][pixel.x] = pixel.color;
    }
  }
  catch(err) {
    logger.error(err);
  }
}

function getIdFromToken(token){
  let decodedToken = jwt.decode(token, process.env.JWT_KEY);
  return decodedToken.sub;
}

function getNameFromToken(token){
  let decodedToken = jwt.decode(token, process.env.JWT_KEY);
  return decodedToken.name;
}

async function checkForUser(userName, Email){
  let userId = null;
  if(userName){
    await knex('users')
      .where('username', userName)
      .returning('user_id')
      .catch(err => {
        logger.error(err);
      })
      .then(response => {
        if(response.length > 0){
          userId = response[0].user_id;
        }
      });
  }
  if(!userId && Email){
    await knex('users')
      .where('email', Email)
      .returning('user_id')
      .catch(err => {
        logger.error(err);
      })
      .then(response => {
        if(response.length > 0){
          userId = response[0].user_id;
        }
      });
  }
  return userId;
}

async function addUserPermission(userId, projectId){
  let result;
  await knex('users_projects')
    .insert({user_id: userId, project_id: projectId})
    .returning('*')
    .catch(err => {
      logger.error(err);
    })
    .then(response => {
      if(response){
        result = true;
      } else {
        result = false;
      }
    });
  return result;
}

module.exports = {
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
  getIdFromToken,
  getUserProjectsArray,
  checkForUser,
  addUserPermission,
  getNameFromToken
}
