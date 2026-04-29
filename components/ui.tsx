import clsx from "clsx";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("rounded-lg border border-line/10 bg-surface p-5 shadow-soft", className)}>{children}</section>;
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  return (
    <button
      className={clsx(
        "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:opacity-50",
        variant === "primary" && "bg-ink text-paper hover:bg-ink/90",
        variant === "secondary" && "border border-line/10 bg-surface text-ink hover:bg-mint/35",
        variant === "danger" && "bg-coral text-paper hover:bg-coral/90",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export const inputClass = "focus-ring h-10 rounded-md border border-line/10 bg-surface px-3 text-sm text-ink shadow-sm";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink/75">
      {label}
      {children}
    </label>
  );
}

export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold tracking-normal">{title}</h1>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line/20 bg-surface/60 p-8 text-center text-sm text-ink/60">{children}</div>;
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(value, 100));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-line/10">
      <div className={clsx("h-full rounded-full", value > 100 ? "bg-coral" : "bg-moss")} style={{ width: `${clamped}%` }} />
    </div>
  );
}
