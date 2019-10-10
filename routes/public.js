// Load requirements
const express = require('express');


// Load public controllers
const index = require('../controllers/index');
const location = require('../controllers/location');
const details = require('../controllers/details');
const error = require('../controllers/error');

const router = express.Router();

router.route('/').get(index.display);


router.route('/search').get(location.search);
router.route('/search/*').get(location.search);
router.route('/details').get(details.getDetails);
router.route('/details/*').get(details.getDetails);

// Error routes
router.route('/404').get(error.display);
router.route('/403').get(error.display);

// Display error for details
router.route('/502').get(error.details);

router.route('/help').get((req, res) => {res.render('pages/help')});

module.exports = router;
