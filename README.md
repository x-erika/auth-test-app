# auth-test-app

Sample OAuth/OIDC relying-party for [`auth-server-but-java`](../auth-server-but-java).

Authorization-code + PKCE flow, server-side token exchange, id_token signature verification against the auth-server's JWKS, and a live `/userinfo` call to confirm the access token works end-to-end. Built on Next.js 16 (App Router) + React 19.

## What's in it

- `app/login/route.ts` — mints state + nonce + PKCE verifier, redirects to `/oauth/authorize`
- `app/callback/route.ts` — handles the bounce-back, exchanges `code` for tokens, verifies the id_token
- `app/logout/route.ts` — clears the local session cookie, then RP-initiated logout via `/oauth/logout`
- `app/page.tsx` — server-rendered home: login button if anonymous, decoded id_token claims + live `/userinfo` if signed in
- `lib/pkce.ts` — RFC 7636 verifier + S256 challenge
- `lib/jwt.ts` — `jose`-backed id_token verification (sig + iss + aud + exp + nonce) using a remote JWKS
- `lib/oauth.ts` — token exchange and userinfo fetch
- `lib/session.ts` — two HttpOnly cookies: `oauth_flow` (short-lived, holds the flow state/nonce/PKCE) and `app_session` (holds access + id token + expiry)

## Quick start

You need three things running locally:

| Component | Port | Purpose |
|---|---|---|
| `auth-server-but-java` | 8080 | Issues tokens, hosts /oauth/authorize, /userinfo, JWKS |
| `auth-test-app` (this) | 3002 | Sample relying-party — logs in, shows claims |
| (optional) `auth-admin-but-java` | 3000 | Admin UI — useful for inspecting users / clients / sessions |

The bootstrap in `auth-server-but-java` seeds a `web-app` public client with both `http://localhost:3000/callback` (admin or another sample) and `http://localhost:3001/callback` (this app) as registered redirect URIs, so the OAuth flow works out of the box.

```bash
# Terminal 1: auth-server
cd ../auth-server-but-java
./mvnw quarkus:dev

# Terminal 2: this app
cd auth-test-app
npm run dev
```

Open <http://localhost:3001>, click **Sign in with Xerika**, log in (e.g. `admin@gmail.com` / `admin123` from the AdminBootstrap), grant consent on the screen the auth-server shows, and you'll land back here with your id_token claims and a fresh `/userinfo` response on display.

## Configuration

Defaults assume everything is on localhost. Override via env vars if you're running the auth-server elsewhere:

| Variable | Default | What |
|---|---|---|
| `AUTH_SERVER_URL` | `http://localhost:8080` | Issuer URL — must match the `iss` claim the auth-server signs |
| `APP_BASE_URL` | `http://localhost:3001` | Public origin of this app (used to build `OAUTH_REDIRECT_URI` if not set) |
| `OAUTH_CLIENT_ID` | `web-app` | Must be a client that exists on the auth-server |
| `OAUTH_REDIRECT_URI` | `<APP_BASE_URL>/callback` | Must be registered on the client |
| `OAUTH_SCOPE` | `openid profile email` | `openid` is required to get an id_token |

A `.env.local` file is the standard place to set these in Next.js — it's gitignored by default.

## Flow walkthrough

1. **GET `/login`** mints `state`, `nonce`, `code_verifier`, stashes them in the `oauth_flow` cookie (HttpOnly, 10 min TTL), redirects to:
   ```
   GET <AUTH_SERVER_URL>/oauth/authorize
     ?response_type=code
     &client_id=web-app
     &redirect_uri=http://localhost:3001/callback
     &scope=openid profile email
     &state=<random>
     &nonce=<random>
     &code_challenge=<S256(code_verifier)>
     &code_challenge_method=S256
   ```
2. The auth-server renders **/login** (if no session) or jumps straight to **/consent** (if signed-in but no prior grant for this scope set on this client). Either way, the browser eventually lands back at:
   ```
   GET /callback?code=<one-shot>&state=<echo>
   ```
3. **GET `/callback`** consumes the `oauth_flow` cookie, verifies `state` matches, then POSTs to `/oauth/token`:
   ```
   grant_type=authorization_code
   code=<one-shot>
   redirect_uri=http://localhost:3001/callback
   client_id=web-app
   code_verifier=<original>
   ```
4. The response carries `access_token`, `id_token`, `expires_in`. We verify the id_token against the auth-server's JWKS (`jose.createRemoteJWKSet`) — signature, `iss`, `aud`, `exp`, plus the `nonce` we minted in step 1. Anything wrong, we bail.
5. Tokens go into an `app_session` HttpOnly cookie, browser is redirected back to `/`.
6. **`/`** reads the session cookie, decodes the (already-verified) id_token, calls `/userinfo` with the access token, and renders both side-by-side.

## Logout

`GET /logout` clears the local cookie, then redirects to `/oauth/logout` on the auth-server with:

- `id_token_hint=<our id_token>` so the auth-server knows which client is asking
- `client_id=web-app`
- `post_logout_redirect_uri=http://localhost:3001/callback`

The auth-server validates the post-logout URI against the client's registered redirect URIs (it reuses the OAuth callback list — known compromise documented in the backend's `LogoutFlow`). The callback handler detects the "no code, no error" case and forwards to `/` for a clean home view.

## Notes

- This is a learning sample — tokens are kept in a plain JSON HttpOnly cookie. Fine for localhost; in production you'd want either short-lived tokens only (and re-auth on every page load) or server-side session storage so the browser doesn't ferry tokens around.
- No refresh-token handling — when the access token expires the cookie auto-evicts and the user is bounced back to the landing view to sign in again. Adding refresh would mean stashing the refresh token alongside and a small "if expiring, refresh" guard in `getSession()`.
- The id_token is decoded twice: once on callback (`jose.jwtVerify` does the cryptographic work + claim checks) and once on every page render (`jose.decodeJwt`, no verify — we trust the cookie because it could only have been written by code that just verified the id_token, and the cookie expiry tracks the access token's so it can't outlive the session).
