const knex = require('../knex');
const winston = require('winston');
const jwt = require('jwt-simple');
const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: 'pixel.log' })
    ]
  });

async function addRating(userid, projectid, rating){
  let result;
  result = await knex('ratings')
    .where({user_id: userid, project_id: projectid})
    .select('*')
    .catch(err => {
      logger.error(err);
    })
    .then(response => {
      if(response.length === 0){
        return knex('ratings')
          .insert({ user_id: userid, project_id: projectid, rating: rating })
          .returning(['user_id', 'project_id', 'rating'])
          .catch(err => {
            logger.error(err);
          })
          .then(response2 => {
            if(response2 === undefined ){
              //username or project don't exist
              return -1;
            } else {
              return response2[0];
            }
          })
      }
      else {
        let id = response[0].rating_id;
        return knex('ratings')
          .where({ rating_id: id })
          .update({ rating: rating })
          .returning('*')
          .catch(err => {
            console.log('error');
            logger.error(err);
          })
          .then(response3 => {
            return response3[0];
          })
      }
    })
  return result;
}

function getRatingByUser(projectid, userid){
  return knex('ratings')
    .where({ project_id: projectid, user_id: userid })
    .returning('rating')
    .catch(err => {
      logger.error(err);
    })
    .then((response) => {
      if(response[0] === undefined){
        return -1;
      } else {
        return response[0].rating;
      }
    })
}

function deleteRating(userid, projectid){
  return knex('ratings')
    .where({ project_id: projectid, user_id: userid })
    .del()
    .returning('rating_id')
    .catch(err => {
      logger.error(err);
    })
    .then((response) => {
      return response[0].rating;
    })
}

function avgRating(projectid){
  return knex('ratings')
    .where({project_id: projectid})
    .select('rating')
    .catch(err => {
      logger.error(err);
    })
    .then((response) => {
      let array = response.map(element => {
        return element.rating;
      });
      let sum = array.reduce((acc, current) => {
        return acc + current;
      });
      return sum/array.length;
    })
}

module.exports = {
  addRating,
  deleteRating,
  getRatingByUser,
  avgRating
};
