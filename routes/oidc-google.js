var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');

const { Issuer, generators } = require('openid-client');

const CONFIG = {
  provider : "Google oidc IdP",
  client: {
    client_id: "XXXXXXXXXXXXXXXXXXXX",
    client_secret: "YYYYYYYYYYYYYYYYYYYY",
    redirect_uris: ['http://localhost:3000/oidc-google/cb'],
    response_types: ['code'],
    // id_token_signed_response_alg (default "RS256")
    // token_endpoint_auth_method (default "client_secret_basic")
  },
  discoverUrl: 'https://accounts.google.com',
  tokenCookie : "oidc-google",
  baseUrl: '/oidc-google'
}

var client = null
Issuer.discover(CONFIG.discoverUrl) // => Promise
  .then(function (Issuer) {
    // console.log('Discovered issuer %s %O', googleIssuer.issuer, googleIssuer.metadata);
    client = new Issuer.Client(CONFIG.client);
  });


const check_auth = (req, res) => {
  if (!req.cookies[CONFIG.tokenCookie]) {
    // We haven't logged in
    res.redirect(`${CONFIG.baseUrl}/login`);
    return false;
  }
  return true;
}

router.get('/login', function (req, res, next) {

  const code_verifier = generators.codeVerifier();
  // store the code_verifier in your framework's session mechanism, if it is a cookie based solution
  // it should be httpOnly (not readable by javascript) and encrypted.
  res.cookie('code_verifier', code_verifier)
  const code_challenge = generators.codeChallenge(code_verifier);

  var login_link = client.authorizationUrl({
    scope: 'openid email profile',
    code_challenge,
    code_challenge_method: 'S256',
  });
  res.render('oidc-login', { title: `Express with ${CONFIG.provider}`, login_link: login_link });
});

router.get('/cb', function (req, res, next) {
  const params = client.callbackParams(req);
  const code_verifier = req.cookies.code_verifier
  client.callback(CONFIG.client.redirect_uris[0], params, { code_verifier }) // => Promise
  .then(function (tokenSet) {
    // console.log('received and validated tokens %j', tokenSet);
    // console.log('validated ID Token claims %j', tokenSet.claims());
    res.cookie(CONFIG.tokenCookie, JSON.stringify(tokenSet));
    res.redirect(`${CONFIG.baseUrl}/`)
  })
  .catch((e)=>{
    res.render('info-page', {title: `Auth CB Error with ${CONFIG.provider}`, info: { error : `${e}` } });
  });
})
router.get('/info', function (req, res, next) {
  res.render('info-page', { title: `Express Info with ${CONFIG.provider}`, info: { movie: "Sattae pe Satta", query: req.query } });
})

router.get('/', function (req, res, next) {
  if (!check_auth(req, res)) return
  var tokenSet = JSON.parse(req.cookies[CONFIG.tokenCookie])
  res.render('info-page', { title: `Tokens with ${CONFIG.provider}`, info: { tokens: tokenSet} });
});

router.get('/user', function (req, res) {
  if (!check_auth(req, res)) return
  console.log('Cookies %j',req.cookies)
  var tokenSet = JSON.parse(req.cookies[CONFIG.tokenCookie])
  var access_token = tokenSet.access_token
  client.userinfo(access_token) // => Promise
  .then(function (userinfo) {
    // console.log('userinfo %j', userinfo);
    res.render('info-page', { title: `Userinfo with ${CONFIG.provider}`, info: { tokens: tokenSet,userinfo: userinfo} });
  })
  .catch((e)=>{
    res.render('info-page', { title: 'Error', info: { error : `${e}` } });
  });

});

router.get('/logout', function (req, res) {
  res.clearCookie(CONFIG.tokenCookie);
  res.redirect('/logged-off');
});


module.exports = router;
