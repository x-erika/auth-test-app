import { decodeJwt } from "jose";
import type { IdTokenClaims } from "@/lib/jwt";
import { fetchUserInfo, type UserInfo } from "@/lib/oauth";
import { getSession } from "@/lib/session";

type SearchParams = Promise<{ login_error?: string }>;

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { login_error } = await searchParams;
  const session = await getSession();

  if (!session) {
    return <LandingView errorMessage={login_error ?? null} />;
  }

  const idTokenClaims = decodeJwt<IdTokenClaims>(session.idToken);

  let userinfo: UserInfo | null = null;
  let userinfoError: string | null = null;
  try {
    userinfo = await fetchUserInfo(session.accessToken);
  } catch (e) {
    userinfoError = e instanceof Error ? e.message : String(e);
  }

  return (
    <AuthedView
      idTokenClaims={idTokenClaims}
      userinfo={userinfo}
      userinfoError={userinfoError}
      accessToken={session.accessToken}
      idToken={session.idToken}
      expiresAt={session.expiresAt}
    />
  );
}

function LandingView({ errorMessage }: { errorMessage: string | null }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Auth test app
      </h1>
      <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
        Sample OAuth/OIDC relying-party for{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
          auth-server-but-java
        </code>
        . Logs in via authorization-code + PKCE, verifies the id_token, then
        shows the resulting claims and a live /userinfo response.
      </p>

      {errorMessage && (
        <div className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      <a
        href="/login"
        className="rounded-md bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Sign in with Xerika
      </a>
    </main>
  );
}

function AuthedView({
  idTokenClaims,
  userinfo,
  userinfoError,
  accessToken,
  idToken,
  expiresAt,
}: {
  idTokenClaims: IdTokenClaims;
  userinfo: UserInfo | null;
  userinfoError: string | null;
  accessToken: string;
  idToken: string;
  expiresAt: number;
}) {
  const display =
    idTokenClaims.preferred_username ??
    idTokenClaims.username ??
    idTokenClaims.email ??
    idTokenClaims.sub;

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Hello, {display}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Signed in via OAuth/OIDC. Access token expires{" "}
            <time dateTime={new Date(expiresAt * 1000).toISOString()}>
              {new Date(expiresAt * 1000).toLocaleString()}
            </time>
            .
          </p>
        </div>
        <a
          href="/logout"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Sign out
        </a>
      </header>

      <Card
        title="id_token claims (verified, decoded locally)"
        description="Signature verified against /.well-known/jwks.json on callback. iss + aud + exp + nonce checked at the same time."
      >
        <ClaimsTable claims={idTokenClaims} />
      </Card>

      <Card
        title="/userinfo response (live, Bearer-authenticated)"
        description="Fetched server-side just now using Authorization: Bearer <access_token>. Proves the access token is still valid against the auth-server."
      >
        {userinfo ? (
          <ClaimsTable claims={userinfo as Record<string, unknown>} />
        ) : (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {userinfoError ?? "no data"}
          </div>
        )}
      </Card>

      <Card
        title="Raw tokens"
        description="HttpOnly cookie keeps these out of JavaScript; this view is server-rendered."
      >
        <TokenBlock label="access_token" value={accessToken} />
        <TokenBlock label="id_token" value={idToken} />
      </Card>
    </main>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
        {title}
      </h2>
      {description && (
        <p className="mb-4 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

function ClaimsTable({ claims }: { claims: Record<string, unknown> }) {
  const entries = Object.entries(claims);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {entries.map(([key, value]) => (
            <tr key={key} className="align-top">
              <td className="py-2 pr-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {key}
              </td>
              <td className="py-2 font-mono text-xs text-zinc-800 dark:text-zinc-200">
                {formatValue(key, value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (
    (key === "exp" || key === "iat" || key === "nbf" || key === "auth_time") &&
    typeof value === "number"
  ) {
    return `${value} (${new Date(value * 1000).toLocaleString()})`;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function TokenBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <code className="block break-all rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
        {value}
      </code>
    </div>
  );
}
