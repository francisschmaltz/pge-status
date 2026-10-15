const mapkit = require("./mapkit");
const pge = require("./pge");

exports.status = async (req, res) => {
  const location = req.query.location;
  if (typeof location !== "string" || !location.trim() || location.length > 256 || /[\u0000-\u001f\u007f]/.test(location)) {
    res.status(400).set("Cache-Control", "no-store").json({ error: "A location is required" });
    return;
  }

  try {
    const address = await mapkit.lookup(location.trim());
    if (!address) {
      res.status(422).set("Cache-Control", "no-store").json({ error: "A complete California street address is required" });
      return;
    }

    req.query.stn = address.stn;
    req.query.str = address.str;
    req.query.cty = address.cty;
    req.query.zip = address.zip;
    req.resolvedAddress = address.address;
    pge.check(req, res);
  } catch (error) {
    console.error(`Unable to look up location: ${error.message}`);
    res.status(502).set("Cache-Control", "no-store").json({ error: "Unable to look up location" });
  }
};
