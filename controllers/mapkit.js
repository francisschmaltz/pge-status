// Load ENV
require('dotenv').config()

const fs = require('fs');

const jwa = require('jwa');
const request = require('request');
const mkTokenGenerate = require('mapkit-token');


const mkPrivKey = fs.readFileSync(__basedir + '/mapkit.p8');

var exports = module.exports = {};

exports.token = (req, res) => {
  res.send(mkTokenGenerate(mkPrivKey, process.env.MAPKEY, process.env.TEAMID));
}
