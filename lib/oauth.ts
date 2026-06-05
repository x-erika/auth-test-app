import { CLIENT_ID, OAUTH_ENDPOINTS, REDIRECT_URI } from "./config";

export type TokenResponse = {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const res = await fetch(OAUTH_ENDPOINTS.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await safeBody(res);
    throw new Error(`Token exchange failed (${res.status}): ${detail}`);
  }

  return (await res.json()) as TokenResponse;
}

/** GET /userinfo with `Authorization: Bearer <access_token>`. */
export type UserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  username?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: unknown;
};

export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const res = await fetch(OAUTH_ENDPOINTS.userinfo, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await safeBody(res);
    throw new Error(`/userinfo failed (${res.status}): ${detail}`);
  }

  return (await res.json()) as UserInfo;
}

async function safeBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 500);
  } catch {
    return "<no body>";
  }
}
