var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


router.get('/logged-off', function(req, res){
    res.render('logged_out', { title: 'Logged Out' });
});

module.exports = router;
