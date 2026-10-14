var exports = module.exports = {};

const httpCodes = {
  '401': ['Not Authorized', 'You are not authroized to view this page, but you can view several other of my work examples!'],
  '403': ['PG&E API Error', 'The backend applicaiton server returned an unexpected response'],
  '404': ['Page Not Found.', 'Something went wrong trying to bring you that page.'],
  '429': ['Too Many Requests', 'You\'ve tried to log in too many times too quickly. So now we are both going to take a break for a bit.'],
  '500': ['Server Error', 'Unable to reach PG&E Servers, or they returned an error. Classic PG&E. Sorry.'],
  '000': ['Unknown Server Error', 'Well this is embaressing. You\'ve reached an error page I didn\'t think of. Please send me a tweet at @francisschmaltz or file an issue on GitHub, and I will get to the bottom of things.']

}

const renderError = (res, code) => {
  const [errorStatus, errorMessage] = httpCodes[code];
  res.status(code === '000' ? 500 : Number(code)).render('pages/error', {
    errorCode: code,
    errorStatus,
    errorMessage,
  });
};

exports.display = (req, res) => {
  const code = req.path.slice(1).replace(/\/$/, '');
  renderError(res, Object.prototype.hasOwnProperty.call(httpCodes, code) ? code : '000');
};

exports.notFound = (req, res) => renderError(res, '404');

exports.serverError = (error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  renderError(res, '500');
};

exports.details = (req, res) => {
  if(!req.query.m || !req.query.loc) {
    exports.notFound(req, res);
    return
  }
  let eMessage = req.query.m;
  let location = req.query.loc
  res.status(502).render('pages/error', {errorCode: `location error`, errorStatus: location, errorMessage: eMessage});
}
