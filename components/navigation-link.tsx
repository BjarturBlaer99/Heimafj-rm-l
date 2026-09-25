"use client";

import clsx from "clsx";
import Link, { useLinkStatus } from "next/link";
import { useState, type ComponentProps } from "react";

type NavigationLinkProps = Omit<ComponentProps<typeof Link>, "prefetch">;

function NavigationPending() {
  const { pending } = useLinkStatus();

  if (!pending) return null;

  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-accent motion-safe:animate-pulse" />
      <span role="status" className="sr-only">Opna síðu…</span>
    </>
  );
}

export function NavigationLink({ children, className, onMouseEnter, onFocus, onTouchStart, ...props }: NavigationLinkProps) {
  const [prefetchReady, setPrefetchReady] = useState(false);

  return (
    <Link
      {...props}
      className={clsx("relative", className)}
      // Fetch the destination, including its data, once the user shows intent.
      prefetch={prefetchReady}
      onMouseEnter={(event) => {
        setPrefetchReady(true);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        setPrefetchReady(true);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        setPrefetchReady(true);
        onTouchStart?.(event);
      }}
    >
      {children}
      <NavigationPending />
    </Link>
  );
}
