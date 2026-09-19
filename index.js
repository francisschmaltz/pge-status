// Load third-party requirements
const express = require('express');

// Set base directory
global.__basedir = __dirname;

// Create express app
const app = express();
const path = __dirname;
const port = process.env.PORT || 3001;

// Load express requirements
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use(express.static(path + '/public'));
app.set('view engine', 'ejs');
app.set('views', path + '/views');


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
