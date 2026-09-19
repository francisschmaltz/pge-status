require("dotenv").config();

const fs = require("fs");
const url = require("url");

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
    const parsedOrigin = url.parse(configuredOrigin);
    if (
      parsedOrigin.protocol !== "https:" ||
      !parsedOrigin.hostname ||
      parsedOrigin.auth ||
      parsedOrigin.port ||
      (parsedOrigin.pathname && parsedOrigin.pathname !== "/") ||
      parsedOrigin.search ||
      parsedOrigin.hash
    ) {
      throw new Error("WEBURL must be an HTTPS origin");
    }
    origin = parsedOrigin.protocol + "//" + parsedOrigin.hostname;
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
