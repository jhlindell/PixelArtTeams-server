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
    .then(flagCheck => {
      if(flagCheck === undefined || flagCheck.length === 0){
        return knex('flags')
          .insert({user_id: userId, project_id: projectId})
          .returning('*')
          .catch(err => {
            logger.error(err);
          })
          .then(insertResult => {
            return (insertResult !== undefined && insertResult.length > 0) ? "success": "error";
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
    .then(flagCount => {
      return flagCount.length;
    });
}

function checkIfUserFlagged(userId, projectId){
  return knex('flags')
    .where({user_id: userId, project_id: projectId})
    .returning('*')
    .catch(err => {
      logger.error(err);
    })
    .then(flagCheck => {
      return (flagCheck && flagCheck.length) ? true: false;
    });
}

module.exports = {
  flagProject,
  getFlagCount,
  checkIfUserFlagged
}
