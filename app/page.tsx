import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CheckCircleIcon as CheckCircle2 } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { MoonIcon as Moon } from "@phosphor-icons/react/dist/ssr/Moon";
import { ReceiptIcon as ReceiptText } from "@phosphor-icons/react/dist/ssr/Receipt";
import { TrendDownIcon as TrendingDown } from "@phosphor-icons/react/dist/ssr/TrendDown";
import { TrendUpIcon as TrendingUp } from "@phosphor-icons/react/dist/ssr/TrendUp";
import Link from "next/link";

const currency = new Intl.NumberFormat("is-IS", {
  style: "currency",
  currency: "ISK",
  maximumFractionDigits: 0
});

const stats = [
  { label: "Tekjur", value: 742000, tone: "text-moss", icon: TrendingUp },
  { label: "Útgjöld", value: 468500, tone: "text-coral", icon: TrendingDown },
  { label: "Raunverulegt eftir", value: 273500, tone: "text-moss", icon: CheckCircle2 }
];

const categories = [
  { name: "Matur", value: 138200, width: "74%", color: "bg-moss" },
  { name: "Reikningar", value: 112400, width: "60%", color: "bg-coral" },
  { name: "Samgöngur", value: 48600, width: "26%", color: "bg-gold" },
  { name: "Áskriftir", value: 21900, width: "12%", color: "bg-ink/60" }
];

const transactions = [
  { note: "Laun", date: "1. júní", amount: 742000, type: "income" },
  { note: "Bónus", date: "8. júní", amount: 18420, type: "expense" },
  { note: "Rafmagn", date: "11. júní", amount: 14620, type: "expense" },
  { note: "Sparnaður", date: "15. júní", amount: 90000, type: "saving" }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line/10 bg-surface">
        <div className="mx-auto flex min-h-[60px] max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="focus-ring rounded-md px-1 py-0.5 transition hover:text-moss" aria-label="Heim">
            <span className="text-[15px] font-bold leading-none">Mín fjármál</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link className="focus-ring rounded-md px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-muted hover:text-ink" href="/login">
              Innskráning
            </Link>
            <Link className="focus-ring rounded-md bg-ink px-3 py-2 text-sm font-semibold text-paper transition hover:bg-ink/90" href="/signup">
              Stofna aðgang
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="max-w-3xl py-2 sm:py-5">
          <p className="mb-3 text-sm font-semibold text-moss">Persónuleg fjármál, á einum stað</p>
          <h1 className="text-4xl font-bold leading-tight tracking-normal sm:text-5xl">Mín Fjármál</h1>
          <p className="mt-4 text-lg leading-8 text-ink/68">
            Persónulegt fjármálayfirlit á íslensku með færslum, reikningum, sparnaði, greiningu og mánaðarlegri stöðu.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-ink/90" href="/signup">
              Prófa með eigin gögnum
              <ArrowRight size={17} />
            </Link>
            <Link className="focus-ring inline-flex min-h-11 items-center rounded-md border border-line/15 bg-surface px-5 py-3 text-sm font-bold text-ink shadow-sm transition hover:bg-muted" href="/login">
              Ég á nú þegar aðgang
            </Link>
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-line/10 bg-surface p-4 shadow-soft sm:p-5 lg:mt-12">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink/55">Sýnigögn</p>
              <h2 className="text-xl font-bold">Júní 2026</h2>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-ink/70">
              <Moon size={18} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-lg border border-line/10 bg-paper/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-ink/55">{stat.label}</p>
                    <Icon size={16} className={stat.tone} />
                  </div>
                  <p className={`mt-2 text-lg font-bold ${stat.tone}`}>{currency.format(stat.value)}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <h3 className="mb-3 font-bold">Útgjöld eftir flokkum</h3>
              <div className="grid gap-3">
                {categories.map((category) => (
                  <div key={category.name}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="font-semibold">{category.name}</span>
                      <span className="text-ink/60">{currency.format(category.value)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-line/10">
                      <div className={`h-full rounded-full ${category.color}`} style={{ width: category.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-bold">Nýlegar færslur</h3>
              <div className="divide-y divide-line/10 rounded-lg border border-line/10 bg-paper/70 px-3">
                {transactions.map((transaction) => (
                  <div key={`${transaction.note}-${transaction.date}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <ReceiptText size={16} className="shrink-0 text-ink/45" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{transaction.note}</p>
                        <p className="text-xs text-ink/50">{transaction.date}</p>
                      </div>
                    </div>
                    <p className={transaction.type === "income" ? "shrink-0 font-bold text-moss" : transaction.type === "saving" ? "shrink-0 font-bold text-ink" : "shrink-0 font-bold text-coral"}>
                      {transaction.type === "income" ? "+" : "-"}
                      {currency.format(transaction.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line/10 bg-surface">
        <div className="mx-auto grid max-w-[1440px] divide-y divide-line/10 px-4 py-8 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          {["CSV/Excel innflutningur", "Mánaðaryfirlit", "Sparnaðarmarkmið"].map((item) => (
            <div key={item} className="px-0 py-5 sm:px-6 sm:py-1 first:pl-0 last:pr-0">
              <p className="font-bold">{item}</p>
              <p className="mt-2 text-sm leading-6 text-ink/60">Sýnigögnin sýna hvernig yfirlitið lítur út áður en þú stofnar aðgang.</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
