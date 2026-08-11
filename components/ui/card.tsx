import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "relative min-w-0 rounded-lg border border-line/15 bg-surface p-4 shadow-[0_1px_2px_rgb(var(--shadow-soft)/0.04),0_12px_32px_rgb(var(--shadow-soft)/0.055)] ring-1 ring-inset ring-paper/40 sm:p-5",
        className
      )}
      {...props}
    />
  );
}
