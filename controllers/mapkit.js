require("dotenv").config();

const fs = require("fs");

const jwt = require("jsonwebtoken");

const genToken = () => {
  const mkKey = process.env.MAPKEY;
  const teamID = process.env.TEAMID;
  const configuredOrigin = String(process.env.WEBURL || "").trim();

  if (!mkKey || !teamID || !configuredOrigin) {
    throw new Error("MapKit token configuration is incomplete");
  }

  let origin;
  try {
    const originMatch = /^https:\/\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*?)\/?$/i.exec(configuredOrigin);
    if (!originMatch) {
      throw new Error("WEBURL must be an HTTPS origin");
    }
    origin = "https://" + originMatch[1].toLowerCase();
  } catch (error) {
    throw new Error("WEBURL must be an HTTPS origin");
  }

  const privKey = fs.readFileSync(__basedir + "/mapkit.p8");

  const token = jwt.sign(
    {
      iat: Math.floor(Date.now() / 1000),
      iss: teamID,
      origin: origin,
      scope: "mapkit_js",
    },
    privKey,
    {
      header: {
        alg: "ES256",
        typ: "JWT",
        kid: mkKey,
      },
      algorithm: "ES256",
      expiresIn: "30m",
    }
  );

  return token;
};

var exports = (module.exports = {});

exports.token = (req, res) => {
  try {
    res.type("text/plain").set("Cache-Control", "no-store").send(genToken());
  } catch (error) {
    console.error(`Unable to generate MapKit token: ${error.message}`);
    res.status(503).json({ error: "Map service unavailable" });
  }
};
