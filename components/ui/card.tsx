"use client";

import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"section">) {
  const cardRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.01, rootMargin: "0px 0px -20px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={cardRef}
      data-scroll-reveal=""
      data-reveal-state={visible ? "visible" : "pending"}
      className={cn(
        "relative min-w-0 rounded-lg border border-line/15 bg-surface p-4 shadow-[0_4px_10px_rgb(var(--shadow-soft)/0.18),0_18px_42px_rgb(var(--shadow-soft)/0.22)] ring-1 ring-inset ring-paper/40 dark:shadow-[0_4px_12px_rgb(var(--shadow-soft)/0.46),0_20px_48px_rgb(var(--shadow-soft)/0.38)] sm:p-5",
        className
      )}
      {...props}
    />
  );
}
