var express = require('express');
const { Issuer, generators } = require('openid-client');
const secret_config = require('../secret_config');
/**
 *  Validation funciton 
 */
const validateConfig = (routerConfig) => {
  if (!(routerConfig.client && routerConfig.discoverUrl && routerConfig.providerName && routerConfig.baseUrl)) {
    throw new Error("Invalid config - required valid client,discoveryUrl,baseUrl,providerName ")
  }
  routerConfig.name = routerConfig.providerName.replace(' ', '')
  routerConfig.authSessionKey = routerConfig.name + "-auth-session-key"
  return routerConfig
}

var client = null
var issuer = null
var routerConfig = validateConfig(secret_config.google)

// see file ../secret_config.js
var router = express.Router();
var authSessionKey = routerConfig.authSessionKey

Issuer.discover(routerConfig.discoverUrl) // => Promise
  .then((Issuer) => {
    console.log('Discovered issuer %s User Info endpoint %O', Issuer.issuer, Issuer.metadata.userinfo_endpoint);
    issuer = Issuer
    if ((issuer.metadata.revocation_endpoint === undefined) && (issuer.metadata.end_session_endpoint !== undefined)) {
      issuer.metadata.revocation_endpoint = issuer.metadata.end_session_endpoint
    }
    client = new Issuer.Client(routerConfig.client);
  })
  .catch((err) => {
    console.error(`Failed to init issuer ${routerConfig.providerName}`, err)
  });


/**
 *  Verifies if the session is authenticated
 */
const getAuthTokens = (req, res) => {
  if (req.session[authSessionKey] === undefined) {
    // We haven't logged in
    console.info("Session not found  redirecting to login link")
    res.redirect(`${routerConfig.baseUrl}/login`);
    return null;
  }
  return JSON.parse(req.session[authSessionKey]);
}

/**
 *  Initiates OAuth2 web Login flow.
 * 
 */
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
  res.render('oidc-login', { title: `Express with ${routerConfig.providerName}`, login_link: login_link });
});

/**
 *  Initiates OAuth2 web Login callback.
 *  # Important - This must be configured on the auth provider  settings where you set/get client_id,client_secret
 * 
 */

router.get('/cb', function (req, res, next) {
  const params = client.callbackParams(req);
  const code_verifier = req.cookies.code_verifier
  client.callback(routerConfig.client.redirect_uris[0], params, { code_verifier }) // => Promise
    .then(function (tokenSet) {
      // console.log('received and validated tokens %j', tokenSet);
      // console.log('validated ID Token claims %j', tokenSet.claims());
      req.session[authSessionKey] = JSON.stringify(tokenSet);
      res.redirect(`${routerConfig.baseUrl}/`)
    })
    .catch((e) => {
      res.render('info-page', { title: `Auth CB Error with ${routerConfig.providerName}`, info: { error: `${e}` } });
    });
})

/**
 * configuration endpoint
 */
router.get('/info', function (req, res, next) {
  res.render('info-page', {
    title: `Express Info with ${routerConfig.providerName}`,
    // info: { movie: "Sattae pe Satta", query: req.query } });
    info: { "issuerMetadata": issuer.metadata }
  });
})

/**
 * Base protecteted page
 */
router.get('/', function (req, res, next) {
  var tokenSet = getAuthTokens(req, res);
  if (tokenSet == null) { return }
  res.render('info-page', { title: `Tokes with ${routerConfig.providerName}`, info: { tokens: tokenSet } });
});

// User Info endpoint
router.get('/user', function (req, res) {
  var tokenSet = getAuthTokens(req, res);
  if (tokenSet == null) { return }
  var access_token = tokenSet.access_token
  client.userinfo(access_token) // => Promise
    .then(function (userinfo) {
      // console.log('userinfo %j', userinfo);
      res.render('info-page', { title: `Userinfo with ${routerConfig.providerName}`, info: { tokens: tokenSet, userinfo: userinfo } });
    })
    .catch((e) => {
      res.render('info-page', { title: 'Error', info: { error: `${e}` } });
    });

});

// Logout endpoint
router.get('/logout', function (req, res) {
  var tokenSet = getAuthTokens(req, res);
  if (tokenSet != null) {
    var access_token = tokenSet.access_token
    client.revoke(access_token)
      .then(() => {
        console.log(`Token revoked ${routerConfig.providerName}`)
        req.session.destroy(function(err) {
          if (err) {
            console.error("Failed to destroy session",err)
          }
        })
      })
      .catch((e) => {
        console.log(`Token revocation failed for ${routerConfig.providerName}`, e)
        res.error(500)
        return
      });
  }
  res.redirect('/logged-off');
});

router.get('/token', function (req, res, next) {
  res.render('code-form', { token_endpoint: `${routerConfig.baseUrl}/token` });
});

router.post('/token', function (req, res, next) {
  client.grant({
    grant_type: 'authorization_code',
    code: req.body.code,
    redirect_uri: req.body.redirect_url
  })
    .then(function (tokenSet) {
      // console.log('received and validated tokens %j', tokenSet);
      // console.log('validated ID Token claims %j', tokenSet.claims());
      req.session[routerConfig.authSessionKey] = JSON.stringify(tokenSet);
      res.redirect(`${routerConfig.baseUrl}/`)
    })
    .catch((e) => {
      res.render('info-page', { title: `Auth Token Error with ${routerConfig.providerName}`, info: { error: `${e}` } });
    });

});


module.exports = router;
