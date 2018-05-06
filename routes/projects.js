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
    .then((projects) => {
      const projectArray = projects.map(element => {
        let project = {
              project_owner: element.project_owner,
              project_id: element.project_id,
              project_name: element.project_name,
              xsize: element.xsize,
              ysize: element.ysize,
            };
        if(element.started_at){
              project.started_at = element.started_at;
        }
        if(element.finished_at){
              project.finished_at = element.finished_at;
        }
        project.grid = (element.grid === '')?
          setupNewGrid(project.xsize, project.ysize):
          JSON.parse(element.grid);       
        return project;
      });
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
  return projectsArray.filter((element)=> {
    if(element.project_id === id){
      return element;
    }
  })[0]
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
  const  newGrid = [];
  for (let i = 0; i < y; i++) {
    const row = [];
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
  .then((projects) => {
    projects.forEach(element => {
      let project = {
            project_id: element.project_id,
            project_name: element.project_name,
            xsize: element.xsize,
            ysize: element.ysize,
          };
          if(element.started_at){
            project.started_at = element.started_at;
          }
          if(element.finished_at){
            project.finished_at = element.finished_at;
          }
          project.is_public = element.is_public;
          project.grid = JSON.parse(element.grid);
          gallery.push(project);
    })
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
        return (moment(b.finished_at).isSameOrAfter(a.finished_at)) ? 1: -1;
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
      return (result && result.length)? true: false;
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
      return (result && result[0].is_public) ? 
        'Project Promoted To Public Gallery':
        'Problem Promoting Project To Public Gallery';
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
