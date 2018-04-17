'use strict';
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const app = require('express')();
const server = require('http').Server(app);
const io = require('./socket');
const bodyParser = require('body-parser');
const router = require('./router');
const cors = require('cors');
const helmet = require('helmet');
const Port = process.env.PORT || 8000;

io.origins(process.env.IOURL);
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
router(app);

io.attach(server, {
	pingInterval: 10000,
	pingTimeout: 5000,
	cookie: false,
});

server.listen(Port, () => {
  console.log("Now listening on port " + Port);
});

app.use((req, res, next) => {
  res.sendStatus(404);
});
