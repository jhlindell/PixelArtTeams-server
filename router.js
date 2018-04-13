const Authentication = require('./auth/authentication');
const passportService = require('./auth/passport');
const passport = require('passport');
const users = require('./routes/users_api');
const payment = require('./routes/payment_api');

const requireAuth = passport.authenticate('jwt', { session: false });
const requireSignin = passport.authenticate('local', { session: false });

module.exports = function(app) {
  app.post('/signin', requireSignin, Authentication.signin);
  app.post('/signup', Authentication.signup);
  app.use('/api/users', users);
  app.use('/api/payment', payment);
}
