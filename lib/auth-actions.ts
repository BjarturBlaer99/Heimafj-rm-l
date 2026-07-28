"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  message?: string;
};

const forgotSchema = z.object({
  email: z.string().email().max(120)
});

const resetSchema = z.object({
  password: z.string().min(8).max(100)
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
  const parsed = authSchema.pick({ email: true, password: true }).safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? "")
  });

  if (!parsed.success) {
    return { error: "Athugaðu netfang og lykilorð." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
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
    return { error: "Vinsamlegast fylltu út öll skyldusvið rétt." };
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
    return { error: error.message };
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
    return { error: error.message };
  }

  return { message: "Athugaðu tölvupóstinn þinn fyrir endurstillingartengil." };
}

export async function resetPasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetSchema.safeParse({
    password: String(formData.get("password") ?? "")
  });

  if (!parsed.success) {
    return { error: "Lykilorð þarf að vera að minnsta kosti 8 stafir." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
