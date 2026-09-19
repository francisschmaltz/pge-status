require("dotenv").config();

const fs = require("fs");
const crypto = require("crypto");

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

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "ES256", typ: "JWT", kid: mkKey }));
  const payload = base64Url(JSON.stringify({
    iss: teamID,
    iat: issuedAt,
    exp: issuedAt + 30 * 60,
    origin,
    scope: "mapkit_js",
  }));
  const signingInput = `${header}.${payload}`;
  const signer = crypto.createSign("SHA256");
  signer.update(signingInput);
  signer.end();

  return `${signingInput}.${base64Url(derToJose(signer.sign(privKey)))}`;
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
