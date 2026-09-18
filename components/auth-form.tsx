"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { forgotPasswordAction, loginAction, resetPasswordAction, signupAction, type AuthState } from "@/lib/auth-actions";
import { PASSWORD_MIN_LENGTH, PASSWORD_PATTERN, PASSWORD_REQUIREMENTS } from "@/lib/password-policy";
import styles from "./auth-form.module.css";

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

  const description =
    mode === "signup"
      ? "Skráðu upplýsingarnar þínar til að stofna aðgang."
      : mode === "forgot"
        ? "Sláðu inn netfangið þitt til að fá endurstillingartengil."
        : mode === "reset"
          ? "Veldu nýtt lykilorð fyrir aðganginn þinn."
          : "Skráðu þig inn til að opna fjármálayfirlitið þitt.";

  const submitLabel = mode === "login" ? "Skrá inn" : mode === "forgot" ? "Senda tengil" : mode === "reset" ? "Vista nýtt lykilorð" : "Stofna aðgang";

  return (
    <div className={styles.form}>
        <p className={styles.eyebrow}>Mín fjármál</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>

        <form action={formAction} className={styles.fields}>
          {mode === "signup" && (
            <Field label="Fullt nafn">
              <input className={`${inputClass} ${styles.input}`} name="fullName" autoComplete="name" required />
            </Field>
          )}

          {mode !== "reset" && (
            <Field label="Netfang">
              <input className={`${inputClass} ${styles.input}`} name="email" type="email" autoComplete="email" required />
            </Field>
          )}

          {mode !== "forgot" && (
            <Field label="Lykilorð">
              <input
                className={`${inputClass} ${styles.input}`}
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
                <span id="password-requirements" className={styles.requirements}>
                  {PASSWORD_REQUIREMENTS}
                </span>
              ) : null}
            </Field>
          )}

          {mode === "login" && (
            <Link href="/forgot-password" className={`focus-ring ${styles.forgot}`}>
              Gleymt lykilorð?
            </Link>
          )}

          {state.error ? <p role="alert" className="rounded-md border border-coral/20 bg-coral/10 px-3 py-2 text-sm font-medium text-coral">{state.error}</p> : null}
          {state.message ? <p role="status" className="rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-sm font-medium text-moss">{state.message}</p> : null}

          <Button type="submit" disabled={pending} className="mt-1 min-h-12 w-full">
            {pending ? "Augnablik..." : submitLabel}
            {!pending && <ArrowRightIcon size={17} aria-hidden="true" />}
          </Button>
        </form>

        <div className={styles.alternative}>
          <span>{mode === "login" ? "Ekki með aðgang?" : "Þegar með aðgang?"}</span>
          {mode !== "login" && <Link href="/login" className="focus-ring">Innskráning</Link>}
          {mode === "login" && <Link href="/signup" className="focus-ring">Stofna aðgang</Link>}
          {(mode === "forgot" || mode === "reset") && <Link href="/signup" className="focus-ring">Stofna aðgang</Link>}
        </div>
    </div>
  );
}
