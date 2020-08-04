const SecretConfig = {
    google: {
        providerName: "Google OIDC",
        client: {
            client_id: "XXXXXXXXXXXXXXXXXXXXXXXXXX",
            client_secret: "YYYYYYYYYYYYYYYYYYYYYYYYYYY",
            redirect_uris: ['http://localhost:3000/oidc-google/cb'],
            response_types: ['code'],
            // id_token_signed_response_alg (default "RS256")
            // token_endpoint_auth_method (default "client_secret_basic")
        },
        discoverUrl: 'https://accounts.google.com',
        tokenCookie: "oidc-google",
        baseUrl: '/oidc-google'
    }
}

module.exports = SecretConfig