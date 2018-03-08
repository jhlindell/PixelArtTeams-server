const knex = require('../knex');
const winston = require('winston');
const jwt = require('jwt-simple');
const { avgRating } = require('./ratings');
const moment = require('moment');
const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: 'pixel.log' })
    ]
  });

function getProjectsFromDatabase() {
  return knex('projects')
    .select('*')
    .where('is_finished', false)
    .then((response) => {
      let projectArray = [];
      for(let i = 0; i < response.length; i++){
        let object = {};
        object.project_owner = response[i].project_owner;
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

async function addNewProject(projectsArray, obj){
  let decodedToken = jwt.decode(obj.token, process.env.JWT_KEY);
  let owner_id = decodedToken.sub;
  let owner_name = decodedToken.name;
  let timer = obj.timer;
  let newProject = {};
  newProject.project_owner = owner_name;
  newProject.project_name = obj.name;
  newProject.grid = '';
  newProject.ysize = obj.y;
  newProject.xsize = obj.x;

  let start = new Date();
  let startString = moment.utc(start).format();
  let finish = new Date();
  let finishString = null;

  switch(timer){
    case "1min":
      finish = moment().add(1, 'm');
      break;
    case "3min":
      finish = moment().add(3, 'm');
      break;
    case "5min":
      finish = moment().add(5, 'm');
      break;
    case "15min":
      finish = moment().add(15, 'm');
      break;
    case "1hour":
      finish = moment().add(1, 'h');
      break;
    case "1day":
      finish = moment().add(1, 'd');
      break;
    case "unlimited":
      finish = null;
      break;
    default:
      finish = null;
  }

  if(finish){
    finishString = moment.utc(finish).format();
  }

  newProject.started_at = startString;
  newProject.finished_at = finishString;

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

async function galleryRatings(gallery){
  let returnGallery = [];
  let ratedGallery = gallery.map(async (artPiece) => {
    let rating = await avgRating(artPiece.project_id);
    artPiece.rating = rating;
    return artPiece;
  });
  await Promise.all(ratedGallery).then(resolvedGallery => {
    returnGallery = resolvedGallery.map(item => {
      return item;
    })
  });
  return returnGallery;
}

function sortRatedGallery(gallery){
  let sortedGallery = gallery.sort((a, b) => {
    return b.rating - a.rating;
  });
  return sortedGallery;
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

function getProjectFromDbById(projectid){
  return knex('projects')
    .select('*')
    .where('project_id', projectid)
    .then(result => {
      let project = result[0];
      project.grid = JSON.parse(result[0].grid);
      return project;
    })
    .catch(err => {
      logger.error(err);
    })
}

module.exports = {
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
}
