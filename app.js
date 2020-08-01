var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var cors = require('cors');

const memoryStore = new session.MemoryStore();

var indexRouter = require('./routes/index');
var oidc_googleRouter = require('./routes/oidc-google');

var app = express();

// Enable CORS support
app.use(cors());
// app.locals.pretty = true;
const mySession = session({
  secret: "thisSdabakehouldBeLongAndSecret",
  resave: false,
  saveUninitialized: true,
  store: memoryStore
});

app.use(mySession);


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("Ihavetocallmattresspickup",{ maxAge: 3600000, httpOnly: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/oidc-google', oidc_googleRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
