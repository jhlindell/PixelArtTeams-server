const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcryptjs');

const init = require('./passport');
const knex = require('../knex');

const localOptions = {};

const localLogin = new LocalStrategy(localOptions, (username, password, done) => {
  // check to see if the username exists
  knex('users').where({ username }).first()
  .then((user) => {
    if (!user) return done(null, false);
    if (!bcrypt.compareSync(password, user.hashed_password)) {
      return done(null, false);
    } else {
      return done(null, user);
    }
  })
  .catch((err) => {
    return done(err);
  });
});

// Setup Options for JWT strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromHeader('authorization'),
  secretOrKey: process.env.JWT_KEY
};

const JwtLogin = new JwtStrategy(jwtOptions, function(payload, done) {
  //See if the user id in the payload exists in the database
  //if it does, call done with that
  //otherwise, call done without a user object
  knex('users')
    .select('email', 'username', 'user_id', 'is_mod')
    .where('username', payload.sub)
    .then((user) => {
      if(user) {done(null, user);}
      else {done(null, false);}
    })
    .catch((err) => {
      return done(err, false);
    });
})

passport.use(JwtLogin);
passport.use(localLogin);
// module.exports = passport;
