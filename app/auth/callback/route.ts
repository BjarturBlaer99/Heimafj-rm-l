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

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=invalid_auth_link", url.origin));
  }

  const response = NextResponse.redirect(destination);
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=invalid_auth_link", url.origin));
  }

  return response;
}
