const request = require('request');

const reqHeaders = {
    'Host': 'apim.pge.com',
    'Origin': 'https://m.pge.com',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.1 Safari/605.1.15',
    'Accept-Language': 'en-us',
    'Referer': 'https://m.pge.com/'
};

var exports = module.exports = {};

exports.search = (req, res) => {
  console.log('search');

  let searchLoc = req.query.loc



  const options = {
      url: `https://apim.pge.com/experianNS/search?input=${searchLoc}&filteron=svc_type_code&filterval=%27E%27`,
      headers: reqHeaders
  };



  request(options, (error, response, body) => {
      if (body && response.statusCode == 200) {
        let rawData = JSON.parse(body)
        let results = rawData.results


        res.render('pages/search', {data: results});
      } else {
        let rawData = JSON.parse(body)
        let results = rawData.fault.detail.message || 'Unknown PG&E Server Error'
        console.log('Error');
        console.log(results);
        console.log(error);

        res.render('pages/search', {error: results});
      }
  });

}
