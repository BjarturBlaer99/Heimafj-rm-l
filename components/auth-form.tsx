"use client";

import { useActionState } from "react";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { forgotPasswordAction, loginAction, resetPasswordAction, signupAction, type AuthState } from "@/lib/auth-actions";

const initialState: AuthState = {};

export function AuthForm({ mode }: { mode: "login" | "signup" | "forgot" | "reset" }) {
  const action =
    mode === "signup"
      ? signupAction
      : mode === "forgot"
        ? forgotPasswordAction
        : mode === "reset"
          ? resetPasswordAction
          : loginAction;

  const [state, formAction, pending] = useActionState(action, initialState);

  const title =
    mode === "signup"
      ? "Stofna aðgang"
      : mode === "forgot"
        ? "Endurstilla lykilorð"
        : mode === "reset"
          ? "Veldu nýtt lykilorð"
          : "Velkomin aftur";

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-ink/55">Innskráning og öryggi er meðhöndlað af Supabase Auth.</p>

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
                minLength={8}
                required
              />
            </Field>
          )}

          {state.error ? <p className="rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{state.error}</p> : null}
          {state.message ? <p className="rounded-md bg-mint/70 px-3 py-2 text-sm font-semibold text-ink">{state.message}</p> : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Augnablik..." : title}
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-moss">
          {mode !== "login" && <a href="/login">Innskráning</a>}
          {mode !== "signup" && <a href="/signup">Stofna aðgang</a>}
          {mode === "login" && <a href="/forgot-password">Gleymt lykilorð?</a>}
        </div>
      </Card>
    </main>
  );
}
