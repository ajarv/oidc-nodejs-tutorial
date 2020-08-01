var express = require('express');

const { Issuer, generators } = require('openid-client');

const validateConfig = (routerConfig) => {
  if (!( routerConfig.client && routerConfig.discoverUrl && routerConfig.providerName &&  routerConfig.baseUrl)){
    throw new Error("Invalid config - required valid client,discoveryUrl,baseUrl,providerName ")
  }
  routerConfig.name = routerConfig.providerName.replace(' ','')
  routerConfig.authSessionKey = routerConfig.name+"-auth-session-key"
  return routerConfig
}

const getRouter =  (routerConfig) => {

var client = null
var oidcRouterConfig = validateConfig(routerConfig)
var router = express.Router();

Issuer.discover(oidcRouterConfig.discoverUrl) // => Promise
  .then(function (Issuer) {
    console.log('Discovered issuer %s User Info endpoint %O', Issuer.issuer, Issuer.metadata.userinfo_endpoint);
    client = new Issuer.Client(oidcRouterConfig.client);
  });


const getAuthTokens = (req, res) => {
  if (!(req.session[oidcRouterConfig.authSessionKey] && true)) {
    // We haven't logged in
    res.redirect(`${oidcRouterConfig.baseUrl}/login`);
    return null;
  }
  return JSON.parse(req.session[routerConfig.authSessionKey]);
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
  res.render('oidc-login', { title: `Express with ${oidcRouterConfig.providerName}`, login_link: login_link });
});

router.get('/cb', function (req, res, next) {
  const params = client.callbackParams(req);
  const code_verifier = req.cookies.code_verifier
  client.callback(oidcRouterConfig.client.redirect_uris[0], params, { code_verifier }) // => Promise
  .then(function (tokenSet) {
    // console.log('received and validated tokens %j', tokenSet);
    // console.log('validated ID Token claims %j', tokenSet.claims());
    req.session[routerConfig.authSessionKey] = JSON.stringify(tokenSet);
    res.redirect(`${oidcRouterConfig.baseUrl}/`)
  })
  .catch((e)=>{
    res.render('info-page', {title: `Auth CB Error with ${oidcRouterConfig.providerName}`, info: { error : `${e}` } });
  });
})

router.get('/info', function (req, res, next) {
  res.render('info-page', { title: `Express Info with ${oidcRouterConfig.providerName}`, 
  info: { movie: "Sattae pe Satta", query: req.query } });
})

router.get('/', function (req, res, next) {
  var tokenSet = getAuthTokens(req, res);
  if (tokenSet == null) {return}
  res.render('info-page', { title: `Tokes with ${oidcRouterConfig.providerName}`, info: { tokens: tokenSet} });
});

router.get('/user', function (req, res) {
  var tokenSet = getAuthTokens(req, res);
  if (tokenSet == null) {return}
  
  var access_token = tokenSet.access_token
  client.userinfo(access_token) // => Promise
  .then(function (userinfo) {
    // console.log('userinfo %j', userinfo);
    res.render('info-page', { title: `Userinfo with ${oidcRouterConfig.providerName}`, info: { tokens: tokenSet,userinfo: userinfo} });
  })
  .catch((e)=>{
    res.render('info-page', { title: 'Error', info: { error : `${e}` } });
  });

});

router.get('/logout', function (req, res) {
  req.session[oidcRouterConfig.authSessionKey] = null;
  res.redirect('/logged-off');
});

return router;
}

module.exports = getRouter;
