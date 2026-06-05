import { NextResponse } from "next/server";
import { APP_BASE_URL } from "@/lib/config";
import { verifyIdToken } from "@/lib/jwt";
import { exchangeCodeForTokens } from "@/lib/oauth";
import { consumeFlow, saveSession } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return redirectToErrorPage(errorDescription ?? error);
  }
  if (!code && !state) {
    return NextResponse.redirect(APP_BASE_URL);
  }
  if (!code || !state) {
    return redirectToErrorPage("missing code or state in callback");
  }

  const flow = await consumeFlow();
  if (!flow) {
    return redirectToErrorPage(
      "no flow cookie — login link expired or browser dropped it",
    );
  }
  if (flow.state !== state) {
    return redirectToErrorPage("state mismatch (possible CSRF)");
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code, flow.codeVerifier);
  } catch (e) {
    return redirectToErrorPage(formatError(e));
  }

  try {
    await verifyIdToken(tokens.id_token, flow.nonce);
  } catch (e) {
    return redirectToErrorPage(`id_token verification failed: ${formatError(e)}`);
  }

  const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;
  await saveSession({
    accessToken: tokens.access_token,
    idToken: tokens.id_token,
    expiresAt,
  });

  return NextResponse.redirect(APP_BASE_URL);
}

function redirectToErrorPage(message: string): NextResponse {
  const target = new URL(APP_BASE_URL);
  target.searchParams.set("login_error", message);
  return NextResponse.redirect(target);
}

function formatError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
