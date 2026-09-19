// Load requirements
const express = require("express");

// Load public controllers
const mk = require("../controllers/mapkit");
const pge = require("../controllers/pge");

const error = require("../controllers/error");
const rateLimit = require("../middleware/rate-limit");

const router = express.Router();

// Index is no longer valid due to PG&E API Change
// router.route('/').get((index.display));
router.route("/").get((req, res) => {
  res.redirect("map");
});

// Apple MapKit
router.route("/mkToken").get(rateLimit({ key: "mkToken", limit: 60, windowMs: 60 * 1000 }), mk.token);
router.route("/map").get((req, res) => {
  res.render("pages/map");
});

// PG&E external API check
router.route("/check").get(rateLimit({ key: "check", limit: 30, windowMs: 60 * 1000 }), pge.check);
router.route("/check/*").get(rateLimit({ key: "check", limit: 30, windowMs: 60 * 1000 }), pge.check);

// Error routes
router.route("/404").get(error.display);
router.route("/403").get(error.display);

// Display error for details
router.route("/502").get(error.details);

router.route("/help").get((req, res) => {
  res.render("pages/help");
});

module.exports = router;
