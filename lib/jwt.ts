import { createRemoteJWKSet, jwtVerify } from "jose";
import { AUTH_SERVER_URL, CLIENT_ID, OAUTH_ENDPOINTS } from "./config";

const jwks = createRemoteJWKSet(new URL(OAUTH_ENDPOINTS.jwks));

export type IdTokenClaims = {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
  sid?: string;
  email?: string;
  email_verified?: boolean;
  username?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: unknown;
};

export async function verifyIdToken(
  idToken: string,
  expectedNonce: string,
): Promise<IdTokenClaims> {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: AUTH_SERVER_URL,
    audience: CLIENT_ID,
    // jwtVerify already enforces exp + nbf (with a small clock tolerance).
    clockTolerance: "5s",
  });

  // jose checks signature, iss, aud, exp. nonce is OIDC-specific so we check
  // it ourselves — pairing the nonce we sent on /authorize with the one
  // baked into the id_token closes the replay-attack window where someone
  // re-uses a previous id_token against this app.
  if (payload.nonce !== expectedNonce) {
    throw new Error("id_token nonce mismatch");
  }

  return payload as IdTokenClaims;
}
