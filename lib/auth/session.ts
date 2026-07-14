import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "payguard_session";

export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface SessionPayload {
  userId: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Unset only ever happens on a fresh clone without a real secret configured (local dev, CI,
 * Playwright's prebuilt server) -- see .env.example. Preview/Production must set a real,
 * distinct SESSION_SECRET (docs/CLOUD_DEPLOYMENT.md); this fallback exists so the app still runs
 * out of the box, mirroring lib/db.ts's DATABASE_URL default.
 */
function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? "local-dev-insecure-session-secret-change-me";
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
}

/** Signs a session cookie value for `userId`. Stateless: revocation works only via `User.isActive`
 * (checked on every request in lib/acting-user.ts), not by invalidating this token -- see the
 * "No server-side session revocation" entry in docs/SECURITY_AND_LIMITATIONS.md. */
export function signSession(userId: string, now: Date = new Date()): string {
  const payload: SessionPayload = {
    userId,
    issuedAt: now.getTime(),
    expiresAt: now.getTime() + SESSION_MAX_AGE_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

/** Verifies a session cookie value's signature and expiry, returning the `userId` if valid. Does
 * NOT check whether the user still exists or is active -- callers (lib/acting-user.ts) must do
 * that themselves against the database. */
export function verifySession(cookieValue: string | undefined, now: Date = new Date()): string | null {
  if (!cookieValue) return null;

  const separatorIndex = cookieValue.indexOf(".");
  if (separatorIndex < 0) return null;
  const encodedPayload = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof payload.userId !== "string" || typeof payload.expiresAt !== "number") return null;
  if (now.getTime() > payload.expiresAt) return null;

  return payload.userId;
}
