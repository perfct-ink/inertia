# Apple and Google sign-in for the Mac app

The native login screen offers **Continue with Apple**, **Continue with Google**, and email/password sign-in. Provider sign-in uses `ASWebAuthenticationSession`, then returns to the app's `com.inertia.native` callback scheme. The backend validates the provider's signed ID token and exchanges a short-lived, one-use, PKCE-bound code for the normal Inertia JWT. Provider credentials and private keys stay on the server. No Inertia bearer token goes into a URL.

## Configure the backend

For local Docker development, set these in the repository's ignored `.env` file. For production, set them in the Rails server's environment. Configure only the providers you want to enable; the others report that they are not configured.

| Variable | Value |
| --- | --- |
| `OAUTH_CALLBACK_BASE_URL` | Public origin of the API that handles provider callbacks, for example `https://inertia.it.com`. For Google-only local development, `http://localhost:3000` works. |
| `GOOGLE_CLIENT_ID` | Google OAuth **Web application** client ID. |
| `GOOGLE_CLIENT_SECRET` | Secret for that Google client. |
| `APPLE_CLIENT_ID` | Apple **Services ID** configured for Sign in with Apple. |
| `APPLE_TEAM_ID` | Apple Developer team ID. |
| `APPLE_KEY_ID` | ID of the Sign in with Apple private key. |
| `APPLE_PRIVATE_KEY` | Contents of the `.p8` signing key. Use a quoted multiline value, or literal `\n` between lines. |
| `BYPASS_AUTH` | Set to `false` for local testing of real user accounts. The default dev bypass selects the seed user regardless of login. |

The Mac binary needs only `INERTIA_API_URL` and `INERTIA_WEB_URL`, which `make dev-mac` sets to localhost. Never put provider secrets in the app or frontend.

## Google setup

1. In Google Cloud, configure the OAuth consent screen. If it is in testing mode, add your Google account as a test user.
2. Create an OAuth client with application type **Web application**. The backend performs the provider's authorization-code exchange.
3. Add this exact authorized redirect URI, replacing the origin with `OAUTH_CALLBACK_BASE_URL`:
   `https://inertia.it.com/api/v1/auth/social/google/callback`
4. For local Google-only development, you can instead register:
   `http://localhost:3000/api/v1/auth/social/google/callback`
5. Put the client ID and secret in the backend environment.

## Apple setup

1. Enable Sign in with Apple for your primary App ID in your Apple Developer account.
2. Create a **Services ID**, enable Sign in with Apple, and associate it with the primary App ID.
3. In the Services ID's web authentication configuration, register your callback domain and this exact return URL:
   `https://inertia.it.com/api/v1/auth/social/apple/callback`
4. Create a Sign in with Apple key associated with the primary App ID. Download its `.p8` file and configure the key ID, team ID, Services ID, and private key in the backend environment.
5. For local development, expose port 3000 through a public HTTPS tunnel, register that tunnel's domain and return URL with Apple, and use its origin for `OAUTH_CALLBACK_BASE_URL`. Register the same origin with Google if testing both providers together.

Apple requires an HTTPS return URL with a domain; localhost and IP addresses are not allowed. Apple sends the response as a form POST. The backend generates a five-minute Apple client-secret JWT from the configured private key; no manually renewed client-secret token is required. This browser-based integration works with the local ad-hoc-signed Mac build; it does not invoke native Apple ID authorization or require a Sign in with Apple entitlement in that build.

## Apply and test

After editing `.env`, recreate the backend and frontend containers to load the environment:

```sh
docker compose up -d backend frontend
docker compose exec -T backend bundle exec rails db:migrate
make dev-mac
```

`make dev-mac` also applies pending migrations. To rebuild only the Mac binary while services are running, use `make mac-build`, then quit Inertia and reopen the native bundle with local endpoints:

```sh
open -n --env INERTIA_API_URL=http://localhost:3000 --env INERTIA_WEB_URL=http://localhost:5174 macos/dist/Inertia.app
```

Try signing in, canceling the provider browser, and signing in again after a relaunch. Successful sign-in opens Documents, Sheets & Tables. Sessions remain memory-only, as with password sign-in.

New social users receive an Inertia account and workspace. Later sign-ins use the provider's stable subject ID, including Apple's private-relay identities. An existing email/password account is **not automatically linked** to a provider with a matching email: use its password to sign in. An authenticated account-linking screen is not part of this change. Apple sign-in may supply a private relay email; configure Apple's email relay service separately if you later send mail to those addresses.

Automated tests use locally signed provider tokens and stubbed HTTP responses, so they need no real credentials. Real provider consent and callbacks still require the configuration above.

## Provider documentation

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Apple authorization requests and callback restrictions](https://developer.apple.com/documentation/signinwithapplerestapi/request-an-authorization-to-the-sign-in-with-apple-server.)
- [Apple token validation](https://developer.apple.com/documentation/signinwithapplerestapi/generate-and-validate-tokens)
- [Apple system browser authentication](https://developer.apple.com/documentation/authenticationservices/authenticating-a-user-through-a-web-service)
