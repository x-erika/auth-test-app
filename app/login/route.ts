import { NextResponse } from "next/server";
import {
  CLIENT_ID,
  OAUTH_ENDPOINTS,
  OAUTH_SCOPE,
  REDIRECT_URI,
} from "@/lib/config";
import {
  codeChallengeS256,
  generateCodeVerifier,
  randomToken,
} from "@/lib/pkce";
import { saveFlow } from "@/lib/session";

export async function GET() {
  const state = randomToken();
  const nonce = randomToken();
  const codeVerifier = generateCodeVerifier();

  await saveFlow({ state, nonce, codeVerifier });

  const authorizeUrl = new URL(OAUTH_ENDPOINTS.authorize);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authorizeUrl.searchParams.set("scope", OAUTH_SCOPE);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("nonce", nonce);
  authorizeUrl.searchParams.set("code_challenge", codeChallengeS256(codeVerifier));
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authorizeUrl.toString());
}
