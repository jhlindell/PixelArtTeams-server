'use strict';
const knex = require('../knex');
const jwt = require('jwt-simple');
const winston = require('winston');
const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: 'pixel.log' })
    ]
  });

async function addUserPermission(userId, projectId){
  let result;
  result = await knex('users_projects')
    .where({user_id: userId, project_id: projectId})
    .select('*')
    .catch(err => {
      logger.error(err);
    })
    .then(response => {
      if(response.length === 0){
        return knex('users_projects')
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
        return "user already exists";
      }
    });
  return result;
}

async function addPermissionsByList(projectid, list){
  for(let i = 0; i < list.length; i++){
    let userid = await getIdFromUsername(list[i]);
    await addUserPermission(userid, projectid)
  }
}

async function getIdFromUsername(username){
  let result;
  result = await knex('users')
    .where({username: username })
    .select('user_id')
    .catch(err => {
      logger.error(err);
    })
    .then(response => {
      if(response.length > 0){
        return response[0].user_id;
      }
    })
  return result;
}

async function removeUserPermission(userid, projectid){
  let result
  result = await knex('users_projects')
    .where({ user_id: userid })
    .del()
    .returning('user_id')
    .catch(err => {
      logger.error(err);
    })
    .then(response => {
      // console.log('remove user permission response: ', response[0]);
    })
  return result;
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

function getIdFromToken(token){
  let decodedToken = jwt.decode(token, process.env.JWT_KEY);
  return decodedToken.sub;
}

function getNameFromToken(token){
  let decodedToken = jwt.decode(token, process.env.JWT_KEY);
  return { username: decodedToken.name, isMod: decodedToken.isMod };
}

module.exports = {
  addUserPermission,
  removeUserPermission,
  getIdFromUsername,
  checkForUser,
  getUserProjectsArray,
  getIdFromToken,
  getNameFromToken,
  addPermissionsByList
}
