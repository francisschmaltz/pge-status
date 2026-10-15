require("dotenv").config();

const fs = require("fs");
const crypto = require("crypto");
const https = require("https");

const base64Url = (value) => Buffer.from(value).toString("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");

const readDerInteger = (signature, offset) => {
  if (signature[offset] !== 0x02) throw new Error("Invalid ECDSA signature");
  const length = signature[offset + 1];
  const start = offset + 2;
  const end = start + length;
  let value = signature.slice(start, end);

  while (value.length > 32 && value[0] === 0) value = value.slice(1);
  if (value.length > 32) throw new Error("Invalid P-256 signature");

  return {
    value: Buffer.concat([Buffer.alloc(32 - value.length), value]),
    next: end,
  };
};

const derToJose = (signature) => {
  if (signature[0] !== 0x30) throw new Error("Invalid ECDSA signature");
  let offset = 2;
  const r = readDerInteger(signature, offset);
  offset = r.next;
  const s = readDerInteger(signature, offset);
  return Buffer.concat([r.value, s.value]);
};

const genToken = (scope) => {
  const mkKey = process.env.MAPKEY;
  const teamID = process.env.TEAMID;
  const origin = process.env.WEBURL;

  if (!mkKey || !teamID || (!origin && scope !== "server_api")) {
    throw new Error("MapKit token configuration is incomplete");
  }

  const privKey = fs.readFileSync(__basedir + "/mapkit.p8");

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "ES256", typ: "JWT", kid: mkKey }));
  const payload = base64Url(JSON.stringify({
    iss: teamID,
    iat: issuedAt,
    exp: issuedAt + 30 * 60,
    origin: scope === "server_api" ? undefined : origin,
    scope: scope || "mapkit_js",
  }));
  const signingInput = `${header}.${payload}`;
  const signer = crypto.createSign("SHA256");
  signer.update(signingInput);
  signer.end();

  return `${signingInput}.${base64Url(derToJose(signer.sign(privKey)))}`;
};

const getJSON = (path, token) => new Promise((resolve, reject) => {
  const request = https.get({
    host: "maps-api.apple.com", path, timeout: 10000,
    headers: { Authorization: `Bearer ${token}` },
  }, (response) => {
    if (response.statusCode !== 200) {
      response.resume();
      reject(new Error(`Map service returned ${response.statusCode}`));
      return;
    }
    const chunks = [];
    let size = 0;
    response.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1000000) request.destroy(new Error("Map service response exceeded size limit"));
      else chunks.push(chunk);
    });
    response.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (error) {
        reject(error);
      }
    });
    response.on("error", reject);
  });
  request.on("timeout", () => request.destroy(new Error("Map service request timed out")));
  request.on("error", reject);
});

var exports = (module.exports = {});

exports.token = (req, res) => {
  try {
    res.type("text/plain").set("Cache-Control", "no-store").send(genToken());
  } catch (error) {
    console.error(`Unable to generate MapKit token: ${error.message}`);
    res.status(503).json({ error: "Map service unavailable" });
  }
};

exports.lookup = async (location) => {
  const token = await getJSON("/v1/token", genToken("server_api"));
  if (!token.accessToken) throw new Error("Invalid map token response");

  const data = await getJSON(`/v1/search?q=${encodeURIComponent(location)}`, token.accessToken);
  const place = data.results && data.results[0];
  const address = place && place.structuredAddress;
  if (!address || place.countryCode !== "US" || address.administrativeAreaCode !== "CA" ||
      !address.subThoroughfare || !address.thoroughfare || !address.locality ||
      !/^\d{5}(-\d{4})?$/.test(address.postCode || "")) return null;

  return {
    stn: address.subThoroughfare,
    str: address.thoroughfare,
    cty: address.locality,
    zip: address.postCode,
    address: `${address.subThoroughfare} ${address.thoroughfare}, ${address.locality}, CA ${address.postCode}`,
  };
};
