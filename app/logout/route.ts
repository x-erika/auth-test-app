import { NextResponse } from "next/server";
import { APP_BASE_URL, CLIENT_ID, OAUTH_ENDPOINTS } from "@/lib/config";
import { clearSession, getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  await clearSession();

  if (!session) {
    return NextResponse.redirect(APP_BASE_URL);
  }

  const logoutUrl = new URL(OAUTH_ENDPOINTS.logout);
  logoutUrl.searchParams.set("id_token_hint", session.idToken);
  logoutUrl.searchParams.set("client_id", CLIENT_ID);
  logoutUrl.searchParams.set("post_logout_redirect_uri", `${APP_BASE_URL}/callback`);

  return NextResponse.redirect(logoutUrl.toString());
}
