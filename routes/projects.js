const knex = require('../knex');
const winston = require('winston');
const jwt = require('jwt-simple');
const { avgRating } = require('./ratings');
const { getIdFromToken } = require('./users');
const { getFlagCount } = require('./flags');
const moment = require('moment');
const FLAG_THRESHOLD = 2;
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
        let object = {
          project_owner: response[i].project_owner,
          project_id: response[i].project_id,
          project_name: response[i].project_name,
          xsize: response[i].xsize,
          ysize: response[i].ysize,
        };
        if(response[i].started_at){
          object.started_at = response[i].started_at;
        }
        if(response[i].finished_at){
          object.finished_at = response[i].finished_at;
        }
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
  const gridString = JSON.stringify(project.grid);
  const convertedString = gridString.replace(/[\"]/g, "'");
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
  const project = getProjectById(projectsArray, projectid);
  const index = getIndexOfProject(projectsArray, projectid);
  const time = new Date();
  const timeString = moment.utc(time).format();
  await knex('projects')
  .where('project_id', project.project_id)
  .update({is_finished: true, finished_at: timeString})
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
  const decodedToken = jwt.decode(obj.token, process.env.JWT_KEY);
  const owner_id = decodedToken.sub;
  const owner_name = decodedToken.name;
  const timer = obj.timer;
  let newProject = {
    project_owner: owner_name,
    project_name: obj.name,
    grid: '',
    ysize: obj.y,
    xsize: obj.x,
  };

  const start = new Date();
  const startString = moment.utc(start).format();
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
  for (let i = 0; i < y; i++) {
    let row = [];
    for (let j = 0; j < x; j++) {
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
      let object = {
        project_id: response[i].project_id,
        project_name: response[i].project_name,
        xsize: response[i].xsize,
        ysize: response[i].ysize,
      };
      if(response[i].started_at){
        object.started_at = response[i].started_at;
      }
      if(response[i].finished_at){
        object.finished_at = response[i].finished_at;
      }
      object.is_public = response[i].is_public;
      let grid;
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
  const ratedGallery = gallery.map(async (artPiece) => {
    const rating = await avgRating(artPiece.project_id);
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

async function galleryFlags(gallery){
  let returnGallery = [];
  const flaggedGallery = gallery.map(async (artPiece) => {
    const count = await getFlagCount(artPiece.project_id);
    artPiece.flagCount = count;
    return artPiece;
  });
  await Promise.all(flaggedGallery).then(resolvedGallery => {
    returnGallery = resolvedGallery.map(item => {
      return item;
    })
  });
  return returnGallery;
}

async function sortRatedGallery(gallery, sortStyle, token){
  switch(sortStyle){
    case 'rating':
      const ratingGallery = gallery.sort((a, b) => {
        return b.rating - a.rating;
      });
      const publicRatingGallery = ratingGallery.filter(art => {
        if(art.is_public && art.flagCount < FLAG_THRESHOLD){
          return art;
        }
      });
      return publicRatingGallery;

    case 'new':
      let newGallery = gallery.sort((a, b) => {
        if(moment(b.finished_at).isSameOrAfter(a.finished_at)){
          return 1;
        } else {
          return -1;
        }
      });
      const publicNewGallery = newGallery.filter(art => {
        if(art.is_public && art.flagCount < FLAG_THRESHOLD){
          return art;
        }
      });
      return publicNewGallery;

    case 'myGallery':
      const checkedGallery = await checkMyGallery(gallery, token);
      return checkedGallery;

    case 'flagged':
      return gallery.filter((art) => {
        if(art.flagCount >= FLAG_THRESHOLD){
          return art;
        }
      });

    default:
      return [];
  }
}

async function checkMyGallery(gallery, token){
  const userId = getIdFromToken(token);
  let returnGallery = gallery.map(async (artPiece) => {
    const permissionExists = await checkUserPermissionOnProject(artPiece.project_id, userId);
    if(permissionExists){
      return artPiece;
    }
  })
  await Promise.all(returnGallery).then(resolvedGallery => {
    returnGallery = resolvedGallery.map(item => {
      return item;
    });
  });
  return returnGallery.filter(art => {
    if(art !== undefined){
      return art;
    }
  });
}

function checkUserPermissionOnProject(projectId, userId){
  return knex('users_projects')
    .where({ 'user_id': userId, project_id: projectId})
    .returning('*')
    .then(result => {
      if(result && result.length){
        return true;
      } else {
        return false;
      }
    })
    .catch(err => {
      logger.error(err);
    })
}

function changePixel(projectsArray, pixel){
  try {
    const index = getIndexOfProject(projectsArray, pixel.project);
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

function promoteProjectToPublic(projectid){
  return knex('projects')
    .update('is_public', true)
    .where('project_id', projectid)
    .returning('*')
    .then(result => {
      if(result && result[0].is_public){
        return 'Project Promoted To Public Gallery';
      } else {
        return 'Problem Promoting Project To Public Gallery';
      }
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
  sortRatedGallery,
  checkMyGallery,
  checkUserPermissionOnProject,
  promoteProjectToPublic,
  galleryFlags
}
