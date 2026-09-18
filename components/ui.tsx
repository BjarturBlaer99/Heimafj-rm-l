import clsx from "clsx";
import Link from "next/link";
import { Card as BaseCard } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<typeof BaseCard>) {
  return <BaseCard className={cn("p-4 sm:p-6", className)} {...props} />;
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  return (
    <button
      className={cn(
        buttonVariants({ variant: variant === "primary" ? "default" : variant }),
        "whitespace-normal text-center leading-snug",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export const inputClass =
  "focus-ring h-11 w-full min-w-0 rounded-md border border-line/20 bg-surface px-3.5 text-base text-ink transition-colors placeholder:text-ink/45 hover:border-line/35 focus:border-accent/60 focus:bg-surface lg:text-sm";

export function DateInput({ className, type = "date", ...props }: Omit<React.ComponentProps<"input">, "type"> & { type?: "date" | "month" }) {
  return (
    <span className={cn(inputClass, "date-field block max-w-full", props.disabled && "cursor-not-allowed opacity-50", className)}>
      <input {...props} type={type} />
    </span>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 grid-cols-1 gap-2 text-[13px] font-medium text-ink/80">
      {label}
      {children}
    </label>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header data-scroll-reveal="" className="page-header mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="page-heading min-w-0">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/65">{description}</p> : null}
      </div>
      {action ? <div className="min-w-0 sm:shrink-0">{action}</div> : null}
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
        <h2 className="text-base font-semibold leading-tight tracking-[-0.015em]">{title}</h2>
        {description ? <p className="mt-1.5 text-[13px] leading-relaxed text-ink/65">{description}</p> : null}
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
    <BaseCard className="metric-card h-full overflow-hidden p-0 transition-colors duration-150 group-hover:border-accent/35 sm:p-0">
      <div className="relative flex h-full flex-col px-1 py-4 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-medium leading-relaxed text-ink/65">{label}</p>
          {icon ? <span aria-hidden="true" className={clsx("metric-icon grid h-5 w-5 shrink-0 place-items-center", styles.icon)}>{icon}</span> : null}
        </div>
        <p className="metric-value mt-2 break-words text-2xl leading-tight tracking-[-0.035em] text-ink sm:mt-3 lg:text-[1.875rem]">{value}</p>
        {detail ? <p className="mt-auto pt-2 text-xs leading-relaxed text-ink/65">{detail}</p> : null}
      </div>
    </BaseCard>
  );

  return href ? <Link href={href} className="group block h-full min-w-0">{card}</Link> : <div className="group h-full min-w-0">{card}</div>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line/15 bg-muted/25 p-5 text-center text-sm leading-relaxed text-ink/60 sm:p-8">{children}</div>;
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(value, 100));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-line/10">
      <div className={clsx("h-full rounded-full", value > 100 ? "bg-coral" : "bg-lagoon")} style={{ width: `${clamped}%` }} />
    </div>
  );
}
