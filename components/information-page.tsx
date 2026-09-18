import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppFooter } from "@/components/app-footer";

export function InformationPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-background text-ink">
    <header className="border-b border-line/10"><nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-5 px-5 py-5" aria-label="Aðalvalmynd"><Link href="/" className="flex items-center gap-3"><BrandMark /><span className="font-serif text-xl">Mín fjármál</span></Link><div className="flex items-center gap-5 text-sm"><Link href="/dashboard">Yfirlit</Link><Link href="/help">Aðstoð</Link><ThemeToggle /></div></nav></header>
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:py-16"><div data-scroll-reveal=""><h1 className="font-serif text-4xl sm:text-5xl">{title}</h1><p className="mt-5 max-w-2xl text-base leading-8 text-ink/65">{description}</p></div><div className="mt-10 space-y-10 [&_section]:scroll-mt-24 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:font-semibold [&_p]:mb-3 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-ink/70 [&_li]:mb-2 [&_li]:text-sm [&_li]:leading-7 [&_li]:text-ink/70 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4">{children}</div></main>
    <AppFooter mode="auth" showProductLinks={false} />
  </div>;
}
