"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function AnimatedProgress({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(value, 100));

  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-line/10", className)}>
      <motion.div
        className={cn("h-full rounded-full", value > 100 ? "bg-coral" : "bg-lagoon")}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
