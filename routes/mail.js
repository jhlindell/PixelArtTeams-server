const nodemailer = require('nodemailer');
const winston = require('winston');
const bcrypt = require ('bcrypt');
const knex = require('../knex');
const saltRounds = 10;
const URL = process.env.URL;
const { getIdFromToken, addHashToUser } = require('./users');
const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: 'pixel.log' })
    ]
  });

const transporter = nodemailer.createTransport({
 service: 'Gmail',
 auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS
    }
});

async function sendVerificationEmail(username, email, token){
  let userId = getIdFromToken(token);
  let hashString = username + email;
  let hash = bcrypt.hashSync(hashString, saltRounds);
  let modifiedHash = hash.replace(/\//g, '');
  let hashSaveResult = await addHashToUser(userId, modifiedHash);

  if(hashSaveResult){
    const mailOptions = {
      from: 'PixelArtTeamsDev@gmail.com',
      to: email,
      subject: 'Pixel Art Teams Signup Verification',
      html: `<p>Please click on the following link to finish verification:</p><a href='${URL}/verifyEmail/${modifiedHash}'>Verification Link</a>`
    };

    transporter.sendMail(mailOptions, function (err, info) {
      if(err){
        logger.error(err);
        return 'Problem Sending Email';
      } 
    });
    return 'Verification Email Sent';
  } else return 'user does not exist';
}

async function forgotUsername(email){
  let username;
  let user = await knex('users')
    .where('email', email)
    .returning('username')
    .catch(err => {
      logger.log(err);
    })
  if(user && user.length){
    username = user[0].username;
    const mailOptions = {
      from: 'PixelArtTeamsDev@gmail.com',
      to: email,
      subject: 'Pixel Art Teams Username',
      html: `<p>Your Pixel Art Teams Username is: ${username}</p>`
    };
    transporter.sendMail(mailOptions, function (err, info) {
      if(err){
        logger.error(err);
      }
    });
  } else {
    return 'email does not exist';
  }
  return 'Username Email Sent';
}

async function resendVerificationEmail(email){
  let username;
  let userId;
  let user = await knex('users')
    .where('email', email)
    .returning('*')
    .catch(err => {
      logger.log(err);
    });
  if(user && user.length){
    username = user[0].username;
    userId = user[0].user_id;
    let hashString = username + email;
    let hash = bcrypt.hashSync(hashString, saltRounds);
    let modifiedHash = hash.replace(/\//g, '');
    let hashSaveResult = await addHashToUser(userId, modifiedHash);
    if(hashSaveResult){
      const mailOptions = {
        from: 'PixelArtTeamsDev@gmail.com',
        to: email,
        subject: 'Pixel Art Teams Signup Verification',
        html: `<p>Please click on the following link to finish verification:</p><p><a href='${URL}/verifyEmail/${modifiedHash}'>Verification Link</a></p>`
      };
      await transporter.sendMail(mailOptions, function (err, info) {
        if(err){
          logger.error(err);
        }
      });
    }
  } else {
    return 'user does not exist';
  }
  return 'Verification Email Sent';
}

async function passwordResetEmail(email){
  let username;
  let userId;
  let user = await knex('users')
    .where('email', email)
    .returning('*')
    .catch(err => {
      logger.log(err);
    });
  if(user && user.length){
    username = user[0].username;
    userId = user[0].user_id;
    let hashString = username + email;
    let hash = bcrypt.hashSync(hashString, saltRounds);
    let modifiedHash = hash.replace(/\//g, '');
    let hashSaveResult = await addHashToUser(userId, modifiedHash);
    if(hashSaveResult){
      const mailOptions = {
        from: 'PixelArtTeamsDev@gmail.com',
        to: email,
        subject: 'Pixel Art Teams Password Reset',
        html: `<p>Please click on the following link to reset password:</p><p><a href='${URL}/passwordReset/${modifiedHash}'>Password Reset Link</a></p>`
      };
      await transporter.sendMail(mailOptions, function (err, info) {
        if(err){
          logger.error(err);
        }
      });
    }
  } else {
    return 'user does not exist';
  }
  return 'Password Reset Email Sent';
}

module.exports = {
  sendVerificationEmail,
  forgotUsername,
  resendVerificationEmail,
  passwordResetEmail
}
