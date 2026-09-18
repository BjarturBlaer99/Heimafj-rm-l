import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "focus-ring inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-accent bg-accent text-onAccent hover:bg-accent/90",
        secondary: "border border-line/15 bg-surface text-ink shadow-[0_1px_2px_rgb(var(--shadow-soft)/0.025)] hover:border-line/25 hover:bg-muted/50",
        ghost: "border border-transparent bg-transparent text-ink/60 hover:bg-muted/75 hover:text-ink",
        subtle: "border border-accent/10 bg-accent/10 text-accent hover:border-accent/20 hover:bg-accent/15",
        danger: "border border-coral bg-coral text-white hover:bg-coral/90"
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
