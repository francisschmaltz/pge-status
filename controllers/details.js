const request = require('request');

const reqHeaders = {
    'Host': 'apim.pge.com',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'X-RAS-API-USERKEY': 'pgecocmobile',
    'cocGUID': 'null',
    'Accept-Language': 'en-us',
    'Content-Type': 'application/json',
    'Origin': 'https://m.pge.com',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.1 Safari/605.1.15',
    'Referer': 'https://m.pge.com/',
    'PGE_LOGIN_NAME': 'null'
};

var exports = module.exports = {};

exports.getDetails = (req, res) => {
  console.log('search');

  let searchLoc = req.query.loc


  const options = {
      url: `https://apim.pge.com/cocoutage/genericevent/getPremiseGenericEvent/${searchLoc}`,
      headers: reqHeaders
  };



  request(options, (error, response, body) => {
      if (body && response.statusCode == 200) {
        let rawData = JSON.parse(body)
        let addr = rawData.premAddress1
        let events = rawData.pspsGenericEventDetailsList

        res.render('pages/details', {data: events, location: addr});
      } else {
        let rawData = JSON.parse(body)
        let results = rawData.fault.detail.message || 'Unknown PG&E Server Error'

        console.log('Error');
        console.log(error);
        console.log(results);
        
        res.redirect(`/502/?m=${encodeURIComponent(results)}&loc=${searchLoc}`);
      }
  });

}
