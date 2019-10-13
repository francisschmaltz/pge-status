// Load ENV
require('dotenv').config()

const fs = require('fs');

const jwa = require('jwa');
var jwt = require('jsonwebtoken');


genToken = () => {
	let privKey = fs.readFileSync(__basedir + '/mapkit.p8');
	let mkKey =  process.env.MAPKEY
	let teamID = process.env.TEAMID
  let origin = process.env.WEBURL

  const token = jwt.sign(
    {
      iat: Math.floor(Date.now() / 1000), // Now in seconds
      iss: teamID,
      origin: origin
  	},
    privKey,
    {
	    header: {
        alg: "ES256",
        typ: "JWT",
        kid: mkKey
	    },
	    algorithm: "ES256",
	    expiresIn: "30m"
  	}
  );

  return token;
}

var exports = module.exports = {};

exports.token = (req, res) => {
  res.send(genToken());
}
