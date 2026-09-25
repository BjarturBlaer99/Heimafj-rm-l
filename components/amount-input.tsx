"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { amountInput, amountInputError, displayAmount, editAmount } from "@/lib/amount-input";

type Props = Omit<ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange" | "inputMode" | "pattern"> & {
  value?: string | number;
  defaultValue?: string | number;
  onValueChange?: (value: string) => void;
};

export function AmountInput({ name, value, defaultValue, onValueChange, min, max, step = "0.01", disabled, ...props }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const [display, setDisplay] = useState(() => displayAmount(value ?? defaultValue));
  const canonical = amountInput(display).value ?? "";

  useEffect(() => {
    if (value !== undefined) setDisplay(displayAmount(value));
  }, [value]);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const reset = (event: Event) => {
      // ActionForm may cancel automatic resets after a failed save.
      queueMicrotask(() => {
        if (!event.defaultPrevented) setDisplay(displayAmount(value ?? defaultValue));
      });
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [value, defaultValue]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.setCustomValidity(amountInputError(display, min, max, step));
    if (caretRef.current !== null && document.activeElement === input) {
      input.setSelectionRange(caretRef.current, caretRef.current);
    }
    caretRef.current = null;
  });

  return <>
    <input {...props} ref={inputRef} type="text" inputMode="decimal" lang="is" disabled={disabled} value={display}
      onChange={(event) => {
        const input = event.currentTarget;
        const next = editAmount(display, input.value, input.selectionStart ?? input.value.length, (event.nativeEvent as InputEvent).inputType);
        caretRef.current = next.caret;
        setDisplay(next.display);
        if (next.value !== null) onValueChange?.(next.value);
      }} />
    {name ? <input type="hidden" name={name} value={canonical} disabled={disabled} /> : null}
  </>;
}
