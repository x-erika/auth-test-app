import { randomBytes, createHash } from "node:crypto";
 
function base64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function generateCodeVerifier(): string {
  return base64Url(randomBytes(32));
}

export function codeChallengeS256(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest());
}

export function randomToken(): string {
  return base64Url(randomBytes(16));
}
