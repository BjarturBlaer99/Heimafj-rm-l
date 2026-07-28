"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { PASSWORD_REQUIREMENTS } from "@/lib/password-policy";
import { authSchema, loginSchema, passwordSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  message?: string;
};

const forgotSchema = z.object({
  email: z.string().email().max(120)
});

const resetSchema = z.object({
  password: passwordSchema
});

function siteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:5173";
}

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? "")
  });

  if (!parsed.success) {
    return { error: "Athugaðu netfang og lykilorð." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Netfang eða lykilorð er rangt." };
  }

  redirect("/dashboard");
}

export async function signupAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = authSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    fullName: String(formData.get("fullName") ?? "")
  });

  if (!parsed.success) {
    const passwordIsInvalid = parsed.error.issues.some((issue) => issue.path[0] === "password");
    return { error: passwordIsInvalid ? PASSWORD_REQUIREMENTS : "Vinsamlegast fylltu út öll skyldusvið rétt." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/dashboard`
    }
  });

  if (error) {
    return {
      error: error.code === "weak_password" ? PASSWORD_REQUIREMENTS : "Ekki tókst að stofna aðgang. Reyndu aftur síðar."
    };
  }

  return { message: "Athugaðu tölvupóstinn þinn til að staðfesta aðganginn." };
}

export async function forgotPasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = forgotSchema.safeParse({
    email: String(formData.get("email") ?? "")
  });

  if (!parsed.success) {
    return { error: "Skráðu gilt netfang." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`
  });

  if (error) {
    return { error: "Ekki tókst að senda beiðnina. Reyndu aftur síðar." };
  }

  return { message: "Athugaðu tölvupóstinn þinn fyrir endurstillingartengil." };
}

export async function resetPasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetSchema.safeParse({
    password: String(formData.get("password") ?? "")
  });

  if (!parsed.success) {
    return { error: PASSWORD_REQUIREMENTS };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password
  });

  if (error) {
    return {
      error:
        error.code === "weak_password"
          ? PASSWORD_REQUIREMENTS
          : "Ekki tókst að breyta lykilorðinu. Opnaðu nýjan endurstillingartengil og reyndu aftur."
    };
  }

  redirect("/dashboard");
}
