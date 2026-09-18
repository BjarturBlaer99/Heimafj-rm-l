import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/config";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

const publicRoutes = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"]);

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  if (path === "/" || path === "/demo" || path === "/help" || path === "/privacy") {
    return response;
  }

  const { key, url } = getSupabaseConfig();

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          const previousCookies = response.cookies.getAll();
          response = NextResponse.next({ request });
          previousCookies.forEach((cookie) => response.cookies.set(cookie));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  // Verify the token locally with Supabase's cached public signing keys. The
  // SDK refreshes expired sessions and falls back to Auth for legacy HS256 JWTs.
  // Server data loaders still fetch the current user before reading private data.
  let authenticated = false;
  const isAuthEntry = path === "/login" || path === "/signup";
  try {
    const { data, error } = await supabase.auth.getClaims();
    authenticated = !error && Boolean(data?.claims.sub);
    if (authenticated && isAuthEntry) {
      // Revoked sessions must be allowed to sign in again instead of bouncing
      // between the login page and the server's authoritative user check.
      const { data: userData, error: userError } = await supabase.auth.getUser();
      authenticated = !userError && Boolean(userData.user);
    }
  } catch {
    // The SDK can throw for malformed/expired JWTs. Fail closed, including when
    // untrusted cookie expiry metadata disagrees with the signed token.
    authenticated = false;
  }
  const isPublic = publicRoutes.has(path);

  function redirectWithCookies(pathname: string) {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (!authenticated && !isPublic) {
    if (path.startsWith("/api/")) {
      const unauthorized = NextResponse.json({ error: "Innskráningar er þörf." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
      response.cookies.getAll().forEach((cookie) => unauthorized.cookies.set(cookie));
      return unauthorized;
    }
    return redirectWithCookies("/login");
  }

  if (authenticated && isAuthEntry) {
    return redirectWithCookies("/dashboard");
  }

  return response;
}
