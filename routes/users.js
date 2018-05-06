'use strict';
const knex = require('../knex');
const jwt = require('jwt-simple');
const bcrypt = require('bcryptjs');
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
    .then(project => {
      if(project.length === 0){
        return knex('users_projects')
          .insert({user_id: userId, project_id: projectId})
          .returning('*')
          .catch(err => {
            logger.error(err);
          })
          .then(permissionResult => {
            return (permissionResult !== undefined && permissionResult.length > 0) ? "success": "error";
          });
      } else {
        return "user already exists";
      }
    });
  return result;
}

async function addPermissionsByList(projectid, list){
  for(let i = 0; i < list.length; i++){
    const userid = await getIdFromUsername(list[i]);
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
      .then(user => {
        if(user.length > 0){
          userId = user[0].user_id;
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
      .then(user => {
        if(user.length > 0){
          userId = user[0].user_id;
        }
      });
  }
  return userId;
}

function getUserProjectsArray(projectsArray, token){
  const decodedToken = jwt.decode(token, process.env.JWT_KEY);
  const id = decodedToken.sub;
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
  const decodedToken = jwt.decode(token, process.env.JWT_KEY);
  return decodedToken.sub;
}

function getNameFromToken(token){
  const decodedToken = jwt.decode(token, process.env.JWT_KEY);
  return { username: decodedToken.name, isMod: decodedToken.isMod };
}

function addHashToUser(userId, hash){
  return knex('users')
    .update({ hash: hash })
    .where({ user_id: userId })
    .returning('*')
    .catch(err => {
      logger.error(err);
    })
    .then(user => {
      return (user && user.length) ? true: false;
    });
}

function checkForUserHash(hash){
  return knex('users')
    .where('hash', hash)
    .returning('user_id')
    .catch(err => {
      logger.error(err);
    })
    .then(user => {
      return (user && user.length) ? user[0].user_id : 0
    });
}

function verifyUser(userId){
  return knex('users')
    .update('is_verified', true)
    .where('user_id', userId)
    .returning('*')
    .catch(err => {
      logger.error(err);
    })
    .then(user => {
      return (user && user.length) ? true: false;
    });
}

async function resetPassword(password, hash){
  const salt = bcrypt.genSaltSync();
  const hashedPassword = bcrypt.hashSync(password, salt);
  const user = await knex('users')
    .where('hash', hash)
    .returning('*')
    .catch(err => {
      logger.error(err);
    });
  if(user && user.length){
    let insertResult = await knex('users')
      .where('hash', hash)
      .update('hashed_password', hashedPassword)
      .returning('*')
      .catch(err => {
        logger.error(err);
      });
    return (insertResult && insertResult.length) ? 'success': 'problem updating password';
  } else {
    return 'invalid hash';
  }
}

module.exports = {
  addUserPermission,
  removeUserPermission,
  getIdFromUsername,
  checkForUser,
  getUserProjectsArray,
  getIdFromToken,
  getNameFromToken,
  addPermissionsByList,
  addHashToUser,
  checkForUserHash,
  verifyUser,
  resetPassword
}
