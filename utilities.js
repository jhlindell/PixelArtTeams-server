const knex = require('./knex');
const winston = require('winston');
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
    .where('id', id)
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
    if(projectsArray[i].id === id){
      return projectsArray[i];
    }
  }
}

function getIndexOfProject(projectsArray, id){
  for(let i = 0; i < projectsArray.length; i++) {
    if(projectsArray[i].id === id){
      return i;
    }
  }
  return -1;
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

async function addNewProject(projectsArray, obj){
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
      projectsArray.push(newProject);
    })
    .catch(err => {
      logger.error(err);
    });
}

async function sendFinishedProjectToDatabase(projectsArray, projectid){
  let project = getProjectById(projectsArray, projectid);
  let index = getIndexOfProject(projectsArray, projectid);
  await knex('projects')
  .where('id', project.id)
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
    .where('id', projectid)
    .delete()
    .returning('id')
    .then(result => {
      logger.error('deleting: ', result);
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
      object.id = response[i].id;
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
  logger.info("pixel clicked", pixel);
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
  changePixel
}
