"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({ value, format = String }: { value: number; format?: (value: number) => string }) {
  const reduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const currentValue = useRef(value);

  useEffect(() => {
    // The initial amount is already available; only animate subsequent changes.
    if (reduceMotion || currentValue.current === value) {
      currentValue.current = value;
      setDisplayValue(value);
      return;
    }

    const controls = animate(currentValue.current, value, {
      duration: 0.22,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        currentValue.current = latest;
        setDisplayValue(latest);
      }
    });

    return () => controls.stop();
  }, [reduceMotion, value]);

  return <>{format(displayValue)}</>;
}
