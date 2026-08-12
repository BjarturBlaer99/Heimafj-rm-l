"use client";

import { HouseIcon } from "@phosphor-icons/react/dist/csr/House";
import Link from "next/link";
import { useActionState } from "react";
import { AppFooter } from "@/components/app-footer";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { forgotPasswordAction, loginAction, resetPasswordAction, signupAction, type AuthState } from "@/lib/auth-actions";
import { PASSWORD_MIN_LENGTH, PASSWORD_PATTERN, PASSWORD_REQUIREMENTS } from "@/lib/password-policy";

export function AuthForm({
  mode,
  initialError
}: {
  mode: "login" | "signup" | "forgot" | "reset";
  initialError?: string;
}) {
  const showPasswordPolicy = mode === "signup" || mode === "reset";
  const action =
    mode === "signup"
      ? signupAction
      : mode === "forgot"
        ? forgotPasswordAction
        : mode === "reset"
          ? resetPasswordAction
          : loginAction;

  const [state, formAction, pending] = useActionState(action, { error: initialError } satisfies AuthState);

  const title =
    mode === "signup"
      ? "Stofna aðgang"
      : mode === "forgot"
        ? "Endurstilla lykilorð"
        : mode === "reset"
          ? "Veldu nýtt lykilorð"
          : "Velkomin aftur";

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <main className="grid flex-1 place-items-center px-4 py-10 sm:py-14">
        <Card className="w-full max-w-md border-line/15">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="focus-ring inline-flex rounded-md text-base font-extrabold">
            Mín <span className="ml-1 text-accent">fjármál</span>
          </Link>
          <Link href="/" className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-md px-2.5 text-sm font-semibold text-ink/60 transition hover:bg-muted hover:text-ink">
            <HouseIcon size={17} weight="duotone" />
            Heim
          </Link>
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-ink/55">Örugg leið inn í persónulega fjármálayfirlitið þitt.</p>

        <form action={formAction} className="mt-6 grid gap-4">
          {mode === "signup" && (
            <Field label="Fullt nafn">
              <input className={inputClass} name="fullName" autoComplete="name" required />
            </Field>
          )}

          {mode !== "reset" && (
            <Field label="Netfang">
              <input className={inputClass} name="email" type="email" autoComplete="email" required />
            </Field>
          )}

          {mode !== "forgot" && (
            <Field label="Lykilorð">
              <input
                className={inputClass}
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "login" ? 1 : PASSWORD_MIN_LENGTH}
                maxLength={100}
                pattern={showPasswordPolicy ? PASSWORD_PATTERN : undefined}
                title={showPasswordPolicy ? PASSWORD_REQUIREMENTS : undefined}
                aria-describedby={showPasswordPolicy ? "password-requirements" : undefined}
                required
              />
              {showPasswordPolicy ? (
                <span id="password-requirements" className="text-xs font-normal leading-relaxed text-ink/50">
                  {PASSWORD_REQUIREMENTS}
                </span>
              ) : null}
            </Field>
          )}

          {state.error ? <p className="rounded-md border border-coral/20 bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{state.error}</p> : null}
          {state.message ? <p className="rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-sm font-semibold text-moss">{state.message}</p> : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Augnablik..." : title}
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-accent">
          {mode !== "login" && <Link href="/login">Innskráning</Link>}
          {mode !== "signup" && <Link href="/signup">Stofna aðgang</Link>}
          {mode === "login" && <Link href="/forgot-password">Gleymt lykilorð?</Link>}
        </div>
        </Card>
      </main>
      <AppFooter mode="demo" showProductLinks={false} />
    </div>
  );
}
