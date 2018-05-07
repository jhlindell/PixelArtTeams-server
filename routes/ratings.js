const knex = require('../knex');
const winston = require('winston');
const jwt = require('jwt-simple');
const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: 'pixel.log' })
    ]
  });

function addRating(userid, projectid, rating){
  return knex('ratings')
    .where({user_id: userid, project_id: projectid})
    .select('*')
    .catch(err => {
      logger.error(err);
    })
    .then(usersProjects => {
      if(usersProjects.length === 0){
        return knex('ratings')
          .insert({ user_id: userid, project_id: projectid, rating: rating })
          .returning(['user_id', 'project_id', 'rating'])
          .catch(err => {
            logger.error(err);
          })
          .then(ratings => {
            if(ratings === undefined ){
              //username or project don't exist
              return -1;
            } else {
              return ratings[0];
            }
          })
      }
      else {
        const id = usersProjects[0].rating_id;
        return knex('ratings')
          .where({ rating_id: id })
          .update({ rating: rating })
          .returning('*')
          .catch(err => {
            console.log('error');
            logger.error(err);
          })
          .then(project => {
            return project[0];
          })
      }
    })
}

function getRatingByUser(projectid, userid){
  return knex('ratings')
    .where({ project_id: projectid, user_id: userid })
    .returning('rating')
    .catch(err => {
      logger.error(err);
    })
    .then((returnedRating) => {
      return (returnedRating[0] === undefined)? -1: returnedRating[0].rating;
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
    .then((returnedRating) => returnedRating[0].rating);
}

function avgRating(projectid){
  return knex('ratings')
    .where({project_id: projectid})
    .select('rating')
    .catch(err => {
      logger.error(err);
    })
    .then((response) => {
      const array = response.map(element => {
        return element.rating;
      });
      return (array.length) ? array.reduce((acc, current) => acc + current)/array.length : 0;
    });
}

module.exports = {
  addRating,
  deleteRating,
  getRatingByUser,
  avgRating
};
