'use strict';
const express = require('express');
const router = express.Router();
const knex = require('../knex');
const queries = require('../queries/projects');

router.get('/', (req,res,next) => {
  let id = req.params.id;
  queries.getProjects(id)
  .then(result => {
    res.send(result);
    })
    .catch(err => {
      next(err);
    });
});

router.post('/', (req,res,next) => {
  var project = req.body;
  knex('projects')
    .insert(project)
    .returning("*")
    .then(result => {
      console.log(result[0]);
      res.send(result[0]);
    })
    .catch(err => {
      next(err);
    });
});

router.patch('/id', (req,res,next) => {

});

module.exports = router;
