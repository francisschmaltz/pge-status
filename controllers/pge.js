const http = require('https');

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
  console.log("PGE Check");

  // get details needed for API
  let cty = req.query.cty;
  let zip = req.query.zip;

  let lon = req.query.lon;
  let lat = req.query.lat;

  let str = req.query.str;
  let stn = req.query.stn;

  const dataString = encodeURI(`${stn} ${str} ${cty} ${zip}`);
  // console.log(dataString);

  // const options = {
  //   method: "GET",
  //   url: `https://ewapi.cloudapi.pge.com/single-address-outages?address=${dataString}`,
  //   headers: reqHeaders,
  // };

  

  const options = {
    method: "GET",
    host: "ewapi.cloudapi.pge.com",
    path: `/single-address-outages?address=${dataString}`,
    headers: reqHeaders,
  };

  const request = http.request(options, (response) => {

    if (response.statusCode !== 200) {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          string: "PG&E Error: Unable to check power outage status",
          color: "#0d97ff",
        })
      );
      return;
    }

    response.setEncoding('utf8');
    let body = ""
    response.on('data', (chunk) => {
       body+= chunk
    });
    response.on('end', () => {
      // Take First Object
      let rawData = JSON.parse(body)[0];
      let message;
      let statusColor;
 
       if (!rawData || rawData.prem_state !== "CA") {
         statusColor = "#ffae00";
         message = "Unable to Load PG&E API for this Address";
       } else {
         let outage = rawData.sp_meter_transformer_details[0].current_outage;
         if (outage.last_update) {
           message = `Outage Reported. PG&E Status: ${
             outage.crew_current_status || "Unknown"
           }`;
           statusColor = "#f23050";
         } else {
           message = "No Outage Reported by PG&E";
           statusColor = "#30f27a";
         }
       }
 
       res.setHeader("Content-Type", "application/json");
       res.end(JSON.stringify({ string: message, color: statusColor }));
    })

  });
  
  request.on('error', (e) => {
    console.error(`Unable to check PGE API with request: ${e.message}`);
    res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          string: "PG&E Error: Unable to check power outage status",
          color: "#0d97ff",
        })
      );
  });
  
  request.end();

};
