import { NextResponse } from "next/server";
import { getAuthServerClient } from "@/lib/supabase/auth-server";

/**
 * The public origin. Behind the Northflank/envoy reverse proxy, `req.url` is
 * the internal `http://localhost:3000` address, so redirecting to its origin
 * sends users off-site to localhost. Honor the proxy's forwarded headers and
 * fall back to the request origin for local dev (no proxy).
 */
function publicOrigin(req: Request, url: URL): string {
  const host = req.headers.get("x-forwarded-host");
  if (!host) return url.origin;
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * OAuth + magic-link landing. Both flows return here with a `code`; we
 * exchange it for a session (persisted to cookies — route handlers can
 * write them) and redirect to `next`. Public by nature.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = publicOrigin(req, url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  // Only allow same-origin relative redirects.
  const dest = next.startsWith("/") ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=missing_code", origin));
  }

  const supabase = await getAuthServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(error.message)}`, origin)
    );
  }
  return NextResponse.redirect(new URL(dest, origin));
}
