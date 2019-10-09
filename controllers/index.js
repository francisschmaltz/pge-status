var exports = module.exports = {};

exports.display = (req, res) => {
   console.log('index');
   res.render('pages/index');
}

exports.data = (req, res) => {
   console.log('load data from CloudKit');
}
