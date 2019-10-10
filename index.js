// Load built in requirements
const fs = require('fs');

// Load third-party requirements
const bodyParser = require('body-parser');
const express = require('express');

// Set base directory
global.__basedir = __dirname;

// Create express app
const app = express();
const path = __dirname;
const port = ('port', process.env.PORT || 3001);

// Load express requirements
app.set('trust proxy', 1)
app.use(express.static(path + '/public'));
app.set('view engine', 'ejs');
app.set('views', path + '/views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Load routes
const publicRoutes = require(path + '/routes/public.js');
app.use('/', publicRoutes);


// Fallback route for 404
app.get('*', function(req, res){
  console.log('error');
  res.redirect('/404');
});

// Load app
app.listen(port, () => console.log(`App listening on port ${port}!`))
