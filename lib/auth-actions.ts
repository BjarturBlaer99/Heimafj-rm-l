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

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(100),
    password: passwordSchema,
    confirmPassword: z.string().min(1).max(100)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Lykilorðin passa ekki saman.",
    path: ["confirmPassword"]
  })
  .refine((data) => data.password !== data.currentPassword, {
    message: "Nýja lykilorðið þarf að vera annað en það núverandi.",
    path: ["password"]
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
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return {
        error: "Of margar endurstillingarbeiðnir hafa verið sendar. Bíddu í allt að eina klukkustund og reyndu aftur."
      };
    }

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

export async function changePasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? "")
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];

    if (issue?.path[0] === "confirmPassword") {
      return { error: "Lykilorðin passa ekki saman." };
    }

    if (issue?.path[0] === "currentPassword") {
      return { error: "Sláðu inn núverandi lykilorð." };
    }

    if (issue?.message === "Nýja lykilorðið þarf að vera annað en það núverandi.") {
      return { error: issue.message };
    }

    return { error: PASSWORD_REQUIREMENTS };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { error: "Innskráningin þín er útrunnin. Skráðu þig inn aftur og reyndu svo aftur." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword
  });

  if (signInError) {
    return { error: "Núverandi lykilorð er rangt." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
    current_password: parsed.data.currentPassword
  });

  if (error) {
    if (error.code === "weak_password") {
      return { error: PASSWORD_REQUIREMENTS };
    }

    if (error.code === "same_password") {
      return { error: "Nýja lykilorðið þarf að vera annað en það núverandi." };
    }

    return { error: "Ekki tókst að breyta lykilorðinu. Reyndu aftur síðar." };
  }

  return { message: "Lykilorðinu hefur verið breytt." };
}
