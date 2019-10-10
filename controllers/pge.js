const request = require('request');

const reqHeaders = {
    'Host': 'outages-prod.elasticbeanstalk.com',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-us',
    'Content-Type': 'application/json',
    'Origin': 'http://critweb-outage.pgealerts.com',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.1 Safari/605.1.15',
    'Referer': 'http://critweb-outage.pgealerts.com/?WT.mc_id=Vanity_pge-outages'
};

var exports = module.exports = {};

exports.check = (req, res) => {
  console.log('pge check');

  // get details needed for API
  let cty = req.query.cty
  let zip = req.query.zip

  let lon = req.query.lon
  let lat = req.query.lat

  let str = req.query.str
  let stn = req.query.stn



  const dataString = `{"latitude":${lat},"longitude":${lon},"city":"${cty}","zipcode":"${zip}","streetNo":"${stn}","streetName":"${str}","apartmentNumber":""}`;

  const options = {
      method: 'POST',
      url: 'http://outages-prod.elasticbeanstalk.com/cweb/outages/search_address_outage',
      headers: reqHeaders,
      body: dataString
  };


  request(options, (error, response, body) => {
      if (body && response.statusCode == 200) {
        let rawData = JSON.parse(body)

        let status = rawData.outageResults[0].outage
        let message
        let statusColor

        if (status !== null) {
          message = 'Power Outage Reported'
          statusColor = "#f23050"

        } else {
          message = 'No Outages Reported'
          statusColor = "#30f27a"
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({string: message, color: statusColor}));
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ string: 'Unable to check PG&E', color: "#0d97ff" }));
      }
  });

}
