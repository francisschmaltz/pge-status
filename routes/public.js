// Load requirements
const express = require('express');


// Load public controllers
const index = require('../controllers/index');
const location = require('../controllers/location');
const details = require('../controllers/details');
const error = require('../controllers/error');

const router = express.Router();

router.route('/').get(index.display);

// Handle existing posts
// router.route('/project/auth').get(auth.login);
// router.route('/project/auth').post(apiLimiter, csrfProtection, auth.checkPassword);
router.route('/search').get(location.search);
router.route('/search/*').get(location.search);
router.route('/details').get(details.getDetails);
router.route('/details/*').get(details.getDetails);

// Error routes
router.route('/404').get(error.display);
router.route('/403').get(error.display);

module.exports = router;
