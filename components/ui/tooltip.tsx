"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({ className, sideOffset = 8, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn("tooltip-content z-50 rounded-md border border-line/15 bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink shadow-soft", className)}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
