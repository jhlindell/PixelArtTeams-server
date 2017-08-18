'use strict';

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const users = require('./routes/users');
const port = 8000;

app.use(bodyParser.json());
app.use(cookieParser());

app.use('/api/users', users);

app.use((req, res, next) => {
  res.sendStatus(404);
});

app.listen(port, () => {
  console.log("Now listening on port " + port);
});
