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
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const response = NextResponse.redirect(new URL(next, url.origin));
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

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}
