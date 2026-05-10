"use client";

import { Button } from "@/components/ui";

type ConfirmButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmMessage: string;
  variant?: "primary" | "secondary" | "danger";
};

export function ConfirmButton({ confirmMessage, onClick, ...props }: ConfirmButtonProps) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
