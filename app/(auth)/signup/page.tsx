import { AuthForm } from "@/components/auth-form";
import Link from "next/link";
import { getPrivacyDeployment, privacyContact } from "@/lib/privacy-config";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  if (!getPrivacyDeployment().registrationOpen) return <div className="space-y-6">
    <p className="text-xs font-medium uppercase tracking-widest text-ink/60">Mín fjármál</p>
    <h1 className="font-serif text-4xl">Nýskráning opnar síðar</h1>
    <p className="text-sm leading-7 text-ink/70">Við erum að undirbúa síðuna fyrir almenna notkun. Á meðan geturðu skoðað prufuútgáfuna með tilbúnum gögnum. Ef þú ert þegar með aðgang geturðu skráð þig inn.</p>
    <div className="flex flex-wrap gap-4 text-sm font-medium text-accent"><Link href="/demo" className="focus-ring rounded underline underline-offset-4">Skoða prufuútgáfu</Link><Link href="/login" className="focus-ring rounded underline underline-offset-4">Innskráning</Link></div>
    <p className="text-sm leading-7 text-ink/70">Fyrirspurnir: <a href={`mailto:${privacyContact.email}`} className="break-all text-accent underline underline-offset-4">{privacyContact.email}</a>.</p>
    <Link href="/privacy" className="focus-ring inline-block text-sm text-accent underline underline-offset-4">Persónuverndarstefna</Link>
  </div>;
  return <AuthForm mode="signup" />;
}
