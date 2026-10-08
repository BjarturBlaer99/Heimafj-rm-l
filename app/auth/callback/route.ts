import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/config";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const emailType = type === "signup" || type === "email" || type === "recovery" ? type : null;
  const nextParam = url.searchParams.get("next") ?? "/dashboard";
  // URL parsing normalizes backslashes and control characters. Validate the
  // resolved origin as well as the leading slash before attaching auth cookies.
  let destination = new URL("/dashboard", url.origin);
  if (nextParam.startsWith("/")) {
    try {
      const candidate = new URL(nextParam, url.origin);
      if (candidate.origin === url.origin) destination = candidate;
    } catch {
      // Malformed redirect destinations fall back to the authenticated overview.
    }
  }

  // Email token hashes can be verified in the browser where the email is
  // opened, without requiring a PKCE verifier from the original browser.
  // Keep code exchange for old emails and OAuth redirects.
  const emailLink = Boolean(tokenHash && tokenHash.length <= 2048 && emailType);
  function authRedirect(target: URL) {
    const result = NextResponse.redirect(target);
    result.headers.set("Cache-Control", "private, no-store, max-age=0");
    result.headers.set("Referrer-Policy", "no-referrer");
    return result;
  }
  if ((!code && !emailLink) || (tokenHash !== null && !emailLink)) {
    return authRedirect(new URL("/login?error=invalid_auth_link", url.origin));
  }

  if (emailLink && emailType === "recovery") destination = new URL("/reset-password", url.origin);
  const response = authRedirect(destination);
  const { key, url: supabaseUrl } = getSupabaseConfig();

  const supabase = createServerClient(
    supabaseUrl,
    key,
    {
      cookies: {
        getAll() {
          return request.headers.get("cookie")
            ?.split(";")
            .map((cookie) => cookie.trim())
            .filter(Boolean)
            .filter((cookie) => cookie.indexOf("=") > 0)
            .map((cookie) => {
              const index = cookie.indexOf("=");
              return {
                name: cookie.slice(0, index),
                value: cookie.slice(index + 1)
              };
            }) ?? [];
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const { error } = emailLink
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: emailType! })
    : await supabase.auth.exchangeCodeForSession(code!);

  if (error) {
    return authRedirect(new URL("/login?error=invalid_auth_link", url.origin));
  }

  return response;
}
