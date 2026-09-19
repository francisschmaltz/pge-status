const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const URLConstructor = require("url").URL;

// Load the deployment file from the app directory, not PM2's working directory.
// The checked-in .env is ignored by Git and remains server-local configuration.
const envPath = path.join(__dirname, "../.env");
let loadedEnv;
try {
  loadedEnv = dotenv.parse(fs.readFileSync(envPath));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  loadedEnv = {};
}

// Make the app-local .env authoritative even with older dotenv versions or a
// stale WEBURL inherited from PM2.
Object.assign(process.env, loadedEnv);

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
    const parsedOrigin = new URLConstructor(configuredOrigin);
    if (parsedOrigin.protocol !== "https:" || parsedOrigin.pathname !== "/" || parsedOrigin.search || parsedOrigin.hash || parsedOrigin.username || parsedOrigin.password) {
      throw new Error("WEBURL must be an HTTPS origin");
    }
    origin = parsedOrigin.protocol + "//" + parsedOrigin.host;
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
