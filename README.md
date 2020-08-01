# Nodejs Express with oidc client


Create an app on google cloud and get Oauth2 clientid and client secrets. Add http://localhost:3000/oidc-google/cb to valid redirect urls.


```bash
# Clone this repo
git clone https://github.com/ajarv/oidc-nodejs-tutorial
# edit routes/oidc-google.com replace XXX, YYY with your google client id and client secret
npm install
npm start
# visit http://localhost:3000 fore demo
```
After you log in you should be able to examine the json content for OIDC token and OIDC user profile.