"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { changePasswordAction, type AuthState } from "@/lib/auth-actions";
import { PASSWORD_MIN_LENGTH, PASSWORD_PATTERN, PASSWORD_REQUIREMENTS } from "@/lib/password-policy";

const initialState: AuthState = {};

export function PasswordChangeForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) {
      formRef.current?.reset();
    }
  }, [state.message]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <Field label="Núverandi lykilorð">
        <input
          className={inputClass}
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          maxLength={100}
          required
        />
      </Field>

      <Field label="Nýtt lykilorð">
        <input
          className={inputClass}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={100}
          pattern={PASSWORD_PATTERN}
          title={PASSWORD_REQUIREMENTS}
          aria-describedby="settings-password-requirements"
          required
        />
        <span id="settings-password-requirements" className="text-xs font-normal leading-relaxed text-ink/50">
          {PASSWORD_REQUIREMENTS}
        </span>
      </Field>

      <Field label="Staðfesta nýtt lykilorð">
        <input
          className={inputClass}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={100}
          required
        />
      </Field>

      {state.error ? (
        <p role="alert" className="rounded-md border border-coral/20 bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-sm font-semibold text-moss">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="sm:w-fit">
        {pending ? "Breyti lykilorði..." : "Breyta lykilorði"}
      </Button>
    </form>
  );
}
