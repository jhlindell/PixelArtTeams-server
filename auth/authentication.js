const jwt = require('jwt-simple');
const knex = require('../knex');
const bcrypt = require('bcryptjs');

function tokenForUser(user) {
  const timestamp = new Date().getTime();
  return jwt.encode({
    sub: user.user_id,
    iat: timestamp
  }, process.env.JWT_KEY);
}

exports.signin = function(req, res, next) {
  res.send({
    token: tokenForUser(req.user)
  });
}

exports.signup = function(req, res, next) {
  const email = req.body.email;
  const password = req.body.password;
  const username = req.body.username;

  if (!email || !password || !username) {
    return res.status(422).send({error: 'You must provide an email, password and username'});
  }

  return knex('users')
    .select('email')
    .where('email', email)
    .then((responseemail) => {
    if (responseemail.length) {
      return res.status(422).send({error: 'email is in use'});
    } else {
      knex('users')
        .select('username')
        .where('username', username)
        .then((responsename) => {
          if (responsename.length) {
            return res.status(422).send({error: 'username is in use'});
          } else {
            const salt = bcrypt.genSaltSync();
            const hash = bcrypt.hashSync(req.body.password, salt);
            knex('users')
              .insert({email: req.body.email, hashed_password: hash, username: req.body.username})
              .returning(['email', 'username', 'user_id', 'isMod'])
              .then((user) => {
                res.json({token: tokenForUser(user[0])});
                console.log("signed up user: ", user[0]);
          })
        }
        })
    }
  }).catch(err => {
    return res.json({ err });
    // return next(err);
  })
}
