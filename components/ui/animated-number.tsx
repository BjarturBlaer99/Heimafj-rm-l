"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export function AnimatedNumber({ value, format = String }: { value: number; format?: (value: number) => string }) {
  const reduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayValue(value);
      return;
    }

    const controls = animate(0, value, {
      duration: 0.78,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplayValue(latest)
    });

    return () => controls.stop();
  }, [reduceMotion, value]);

  return <>{format(displayValue)}</>;
}
