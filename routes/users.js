'use strict';
const express = require('express');
const router = express.Router();
const knex = require('../knex');
const bcrypt = require ('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');

router.post('/register', (req,res,next) => {
  let body = req.body;

  bcrypt.hash(body.password, saltRounds, (err, hash)=>{
    knex.insert({
      username: body.username,
      email: body.email,
      hashed_password: hash
    })
    .into('users')
    .returning('*')
    .then((response)=>{
      delete response.hashed_password;
      res.send(response[0]);
    });
  });
});

router.post('/login', (req,res,next) => {
    let body = req.body;
    let username = body.username;
    let password = body.password;
    knex('users')
    .select('user_id', 'username', 'hashed_password', 'isMod', 'email')
    .where('username', username)
    .then((data) => {
      if(data.length === 0){
        res.setHeader('content-type', 'text/plain');
        return res.status(400).send('Bad username or password');

      } else if (bcrypt.compareSync(password, data[0].hashed_password)){
        let user = {
          user_id: data[0].id,
          username: data[0].username,
          isMod: data[0].isMod,
          email: data[0].email,
        };
        var token = jwt.sign(user, process.env.JWT_KEY);
        res.cookie('token', token, {httpOnly: true});
        return res.sendStatus(200);
      } else {
        res.setHeader('content-type', 'text/plain');
        return res.status(400).send('Bad username or password');
      }
    });
});


module.exports = router;
