const knex = require('../knex');
const winston = require('winston');
const { getIdFromToken } = require('./users');
const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: 'pixel.log' })
    ]
  });

async function flagProject(userId, projectId){
  let result;
  result = await knex('flags')
    .where({user_id: userId, project_id: projectId})
    .select('*')
    .catch(err => {
      logger.error(err);
    })
    .then(response => {
      if(response === undefined || response.length === 0){
        return knex('flags')
          .insert({user_id: userId, project_id: projectId})
          .returning('*')
          .catch(err => {
            logger.error(err);
          })
          .then(response => {
            if(response !== undefined && response.length > 0){
              return "success";
            } else {
              return "error";
            }
          });
      } else {
        return "flag already exists";
      }
    });
  return result;
}

function getFlagCount(projectId){
  return knex('flags')
    .where('project_id', projectId)
    .returning('*')
    .catch(err => {
      logger.error(err);
    })
    .then(result => {
      return result.length;
    });
}

function checkIfUserFlagged(userId, projectId){
  return knex('flags')
    .where({user_id: userId, project_id: projectId})
    .returning('*')
    .catch(err => {
      logger.error(err);
    })
    .then(result => {
      if(result && result.length){
        return true;
      } else {
        return false;
      }
    });
}

module.exports = {
  flagProject,
  getFlagCount,
  checkIfUserFlagged
}
