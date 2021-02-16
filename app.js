
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const flash        = require('connect-flash');
const ColorHash    = require('color-hash');
const morgan       = require('morgan');
const path         = require('path');
const app = express(),
  server  = require('http').createServer(app),
  io = require("socket.io")(server, { path: '/socket.io'}),
  session = require('express-session') ({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
      httpOnly: true,
      secure: false,
    },
  }),
  sharedsession = require('express-socket.io-session');
  
const webSocket = require('./socket');
const indexRouter = require('./routes');
const connect = require('./schemas');
connect();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('io', io);

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/gif', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session);
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(flash());

app.use((req, res, next) => {
  if (!req.session.color) {
    const colorHash = new ColorHash();
    req.session.color = colorHash.hex(req.sessionID);
  }
  next();
});

app.use('/', indexRouter);

app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
}); 

const port = process.env.PORT || 8005;
server.listen(port, () => {
  console.log('server listening on port ' + port);
  io.of('/room').use(sharedsession(session, {
    autoSave: true
  }));
  io.of('/chat').use(sharedsession(session, {
    autoSave: true
  }));
  webSocket(io);
});



