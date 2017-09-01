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

module.exports = router;
