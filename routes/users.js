'use strict';
const express = require('express');
const router = express.Router();
const knex = require('../knex');
const winston = require('winston');
const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: 'pixel.log' })
    ]
  });

router.get('/collaborators/:id', (req, res, next) => {
  let id = req.params.id;
  return knex('users')
    .select('users.username')
    .innerJoin('users_projects', 'users.user_id', 'users_projects.user_id')
    .where('users_projects.project_id', id)
    .then(result => {
      let resultArray = [];
      result.forEach(function(element){
        resultArray.push(element.username);
      })
      res.send(resultArray);
    })
    .catch(err => {
      logger.error(err);
    })
})

module.exports = router;
