import clsx from "clsx";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("min-w-0 rounded-lg border border-line/15 bg-surface p-4 shadow-soft sm:p-5", className)}>{children}</section>;
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
        "focus-ring pressable inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-transparent px-4 py-2 text-center text-sm font-semibold leading-snug shadow-sm transition duration-150 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-accent text-onAccent hover:bg-accent/90",
        variant === "secondary" && "border-line/15 bg-surface text-ink hover:border-accent/30 hover:bg-muted",
        variant === "danger" && "bg-coral text-paper hover:bg-coral/90",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export const inputClass =
  "focus-ring h-10 w-full min-w-0 rounded-md border border-line/15 bg-muted/55 px-3 text-sm text-ink shadow-sm transition placeholder:text-ink/35 hover:border-accent/30 focus:bg-surface";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-ink/75">
      {label}
      {children}
    </label>
  );
}

export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-line/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <h1 className="min-w-0 text-2xl font-bold leading-tight tracking-normal sm:text-3xl">{title}</h1>
      {action ? <div className="min-w-0 sm:shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line/20 bg-muted/35 p-4 text-center text-sm leading-relaxed text-ink/60 sm:p-8">{children}</div>;
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(value, 100));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-line/10">
      <div className={clsx("h-full rounded-full", value > 100 ? "bg-coral" : "bg-lagoon")} style={{ width: `${clamped}%` }} />
    </div>
  );
}
