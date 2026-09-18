import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      data-scroll-reveal=""
      className={cn(
        "relative min-w-0 rounded-[10px] border border-line/10 bg-surface p-5 sm:p-6",
        className
      )}
      {...props}
    />
  );
}
