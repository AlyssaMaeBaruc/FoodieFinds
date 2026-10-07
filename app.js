var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');  // add at the top


var recipesRouter = require('./routes/recipes');
var mealPlanRouter = require('./routes/mealPlan');
var shoppingListRouter = require('./routes/shoppingList');
var customRecipesRouter = require('./routes/customRecipes');
var tagsRouter = require('./routes/tags');
var weeklyRulesRouter = require('./routes/weeklyRules');

// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');

var app = express();

app.use(cors());  // add after 'app' is created

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/recipes', recipesRouter);
app.use('/api/meal-plan', mealPlanRouter);
app.use('/api/shopping-list', shoppingListRouter);
app.use('/api/custom-recipes', customRecipesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/weekly-rules', weeklyRulesRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
