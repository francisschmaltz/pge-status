const request = require("request");

const reqHeaders = {
  Host: "ewapi.cloudapi.pge.com",
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "en-us",
  "Content-Type": "application/json",
  Origin: "http://critweb-outage.pgealerts.com",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.1 Safari/605.1.15",
  Referer: "http://critweb-outage.pgealerts.com/?WT.mc_id=Vanity_pge-outages",
};

var exports = (module.exports = {});

exports.check = (req, res) => {
  console.log("pge check");

  // get details needed for API

  console.log(req.query);
  let cty = req.query.cty;
  let zip = req.query.zip;

  let lon = req.query.lon;
  let lat = req.query.lat;

  let str = req.query.str;
  let stn = req.query.stn;

  const dataString = encodeURI(`${stn} ${str} ${cty} ${zip}`);
  console.log(dataString);

  const options = {
    method: "GET",
    url: `http://ewapi.cloudapi.pge.com/single-address-outages?address=${dataString}`,
    headers: reqHeaders,
  };

  request(options, (error, response, body) => {
    if (body && response.statusCode == 200) {
      // Take First Object
      let rawData = JSON.parse(body)[0];
      let message;
      let statusColor;

      if (!rawData || rawData.state !== "CA") {
        statusColor = "#ffae00";
        message = "Unable to Load PG&E API for this Address";
      } else {
        let outage = rawData.current_outage;

        if (outage) {
          message = `Outage Reported. PG&E Status: ${
            rawData.current_outage.crew_current_status || "Unknown"
          }`;
          statusColor = "#f23050";
        } else {
          message = "No Outage Reported by PG&E";
          statusColor = "#30f27a";
        }
      }

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ string: message, color: statusColor }));
    } else {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          string: "PG&E Error: Unable to check power outage status",
          color: "#0d97ff",
        })
      );
    }
  });
};
