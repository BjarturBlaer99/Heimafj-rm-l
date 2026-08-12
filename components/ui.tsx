import clsx from "clsx";
import Link from "next/link";
import { Card as BaseCard } from "@/components/ui/card";

export { BaseCard as Card };

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  return (
    <button
      className={clsx(
        "focus-ring pressable inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-transparent px-4 py-2 text-center text-sm font-semibold leading-snug transition duration-150 disabled:pointer-events-none disabled:opacity-50 [&>svg]:shrink-0",
        variant === "primary" && "bg-accent text-onAccent shadow-[0_6px_16px_rgb(var(--color-accent)/0.2)] hover:-translate-y-px hover:bg-accent/90 hover:shadow-[0_9px_22px_rgb(var(--color-accent)/0.24)]",
        variant === "secondary" && "border-line/15 bg-surface text-ink shadow-sm hover:-translate-y-px hover:border-accent/30 hover:bg-muted",
        variant === "danger" && "bg-coral text-paper shadow-[0_6px_16px_rgb(var(--color-coral)/0.16)] hover:-translate-y-px hover:bg-coral/90",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export const inputClass =
  "focus-ring h-11 w-full min-w-0 rounded-md border border-line/15 bg-surface px-3 text-base text-ink shadow-[0_1px_2px_rgb(var(--shadow-soft)/0.05),inset_0_1px_0_rgb(var(--color-paper)/0.6)] transition placeholder:text-ink/35 hover:border-accent/30 focus:border-accent/35 focus:bg-surface sm:h-10 sm:text-sm";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-ink/75">
      {label}
      {children}
    </label>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="min-w-0 text-[1.65rem] font-bold leading-tight tracking-normal sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink/50">{description}</p> : null}
      </div>
      {action ? <div className="min-w-0 [&_form]:w-full [&_form>button]:w-full sm:shrink-0 sm:[&_form]:w-auto sm:[&_form>button]:w-auto">{action}</div> : null}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  className
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-bold leading-tight">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-relaxed text-ink/48">{description}</p> : null}
      </div>
      {action ? <div className="min-w-0 [&>button]:w-full sm:shrink-0 sm:[&>button]:w-auto">{action}</div> : null}
    </div>
  );
}

const metricTone = {
  accent: { icon: "bg-accent/10 text-accent", value: "text-accent" },
  moss: { icon: "bg-moss/10 text-moss", value: "text-moss" },
  coral: { icon: "bg-coral/10 text-coral", value: "text-coral" },
  gold: { icon: "bg-gold/10 text-gold", value: "text-gold" },
  violet: { icon: "bg-violet/10 text-violet", value: "text-violet" },
  neutral: { icon: "bg-muted text-ink/65", value: "text-ink" }
};

export function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
  href
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: keyof typeof metricTone;
  href?: string;
}) {
  const styles = metricTone[tone];
  const card = (
    <BaseCard className="h-full min-h-[132px] overflow-hidden p-0 transition duration-200 group-hover:-translate-y-[2px] group-hover:border-accent/25 sm:min-h-[142px]">
      <div className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold leading-relaxed text-ink/50">{label}</p>
          {icon ? <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-md", styles.icon)}>{icon}</span> : null}
        </div>
        <p className={clsx("mt-3 break-words text-2xl font-bold leading-tight", styles.value)}>{value}</p>
        {detail ? <p className="mt-auto pt-2 text-xs leading-relaxed text-ink/45">{detail}</p> : null}
      </div>
    </BaseCard>
  );

  return href ? <Link href={href} className="group block h-full min-w-0">{card}</Link> : <div className="group h-full min-w-0">{card}</div>;
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
