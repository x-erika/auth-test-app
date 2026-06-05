import { cookies } from "next/headers";

const FLOW_COOKIE = "oauth_flow";
const SESSION_COOKIE = "app_session";
const FLOW_TTL_SECONDS = 10 * 60;

export type FlowState = {
  state: string;
  nonce: string;
  codeVerifier: string;
};

export type AppSession = {
  accessToken: string;
  idToken: string;
  expiresAt: number;
};

const isProd = process.env.NODE_ENV === "production";

export async function saveFlow(flow: FlowState): Promise<void> {
  const store = await cookies();
  store.set(FLOW_COOKIE, JSON.stringify(flow), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: FLOW_TTL_SECONDS,
  });
}

export async function consumeFlow(): Promise<FlowState | null> {
  const store = await cookies();
  const raw = store.get(FLOW_COOKIE)?.value;
  store.delete(FLOW_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FlowState;
    if (!parsed.state || !parsed.nonce || !parsed.codeVerifier) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveSession(session: AppSession): Promise<void> {
  const store = await cookies();
  const expiresDate = new Date(session.expiresAt * 1000);
  store.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    expires: expiresDate,
  });
}

export async function getSession(): Promise<AppSession | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppSession;
    if (!parsed.accessToken || typeof parsed.expiresAt !== "number") {
      return null;
    }
    if (parsed.expiresAt - 5 <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
