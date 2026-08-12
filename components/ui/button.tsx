import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "focus-ring inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-45 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-accent bg-accent text-onAccent shadow-[0_8px_20px_rgb(var(--color-accent)/0.18)] hover:-translate-y-px hover:bg-accent/90 hover:shadow-[0_10px_24px_rgb(var(--color-accent)/0.24)]",
        secondary: "border border-line/15 bg-surface text-ink shadow-sm hover:-translate-y-px hover:border-accent/30 hover:bg-muted/70",
        ghost: "border border-transparent bg-transparent text-ink/60 hover:bg-muted/75 hover:text-ink",
        subtle: "border border-accent/10 bg-accent/10 text-accent hover:border-accent/20 hover:bg-accent/15"
      },
      size: {
        default: "min-h-10 px-4 py-2",
        sm: "min-h-9 px-3 py-1.5 text-[13px]",
        lg: "min-h-11 px-5 py-2.5",
        icon: "h-10 w-10 shrink-0 p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ asChild = false, className, variant, size, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
