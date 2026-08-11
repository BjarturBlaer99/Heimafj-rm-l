import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-xs font-bold", {
  variants: {
    variant: {
      default: "border-accent/20 bg-accent/10 text-accent",
      neutral: "border-line/10 bg-muted/70 text-ink/65",
      success: "border-moss/20 bg-moss/10 text-moss",
      warning: "border-gold/20 bg-gold/10 text-gold"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export function Badge({ className, variant, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
