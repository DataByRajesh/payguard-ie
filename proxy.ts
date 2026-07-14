import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

const PUBLIC_PATHS = new Set(["/login"]);

/**
 * Named `proxy` (not `middleware`) per Next.js 16's file-convention rename -- see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md. Runs on the
 * Node.js runtime by default in v16, so lib/auth/session.ts's node:crypto usage works here
 * unmodified (this would NOT be true of the old edge-runtime `middleware.ts`).
 *
 * Only an optimistic, cookie-signature check (no DB lookup) -- deactivated users are caught by
 * lib/acting-user.ts's getActingUser()/getCurrentUserOrNull() on the actual request, per the
 * Next.js authentication guide's "optimistic vs. secure checks" guidance.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const userId = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!userId) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
