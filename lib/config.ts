function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, "");
}

export const AUTH_SERVER_URL = stripTrailingSlash(
  process.env.AUTH_SERVER_URL ?? "http://localhost:8080",
);

export const APP_BASE_URL = stripTrailingSlash(
  process.env.APP_BASE_URL ?? "http://localhost:3001",
);

export const CLIENT_ID = process.env.OAUTH_CLIENT_ID ?? "web-app";

export const REDIRECT_URI =
  process.env.OAUTH_REDIRECT_URI ?? `${APP_BASE_URL}/callback`;

export const OAUTH_SCOPE = process.env.OAUTH_SCOPE ?? "openid profile email";

export const OAUTH_ENDPOINTS = {
  authorize: `${AUTH_SERVER_URL}/oauth/authorize`,
  token: `${AUTH_SERVER_URL}/oauth/token`,
  userinfo: `${AUTH_SERVER_URL}/userinfo`,
  jwks: `${AUTH_SERVER_URL}/.well-known/jwks.json`,
  discovery: `${AUTH_SERVER_URL}/.well-known/openid-configuration`,
  logout: `${AUTH_SERVER_URL}/oauth/logout`,
} as const;
