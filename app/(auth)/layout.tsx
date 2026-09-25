import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { AppFooter } from "@/components/app-footer";
import { BrandMark } from "@/components/brand-mark";
import styles from "./auth.module.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.aside}>
          <Link data-scroll-reveal="" href="/" className={`${styles.brand} focus-ring`}><BrandMark /><span>Mín fjármál</span></Link>
          <div data-scroll-reveal="" className={styles.asideContent}>
            <p className={styles.eyebrow}>Persónuleg fjármál á íslensku</p>
            <h2>Hafðu yfirsýn<br /><em>yfir mánuðinn.</em></h2>
            <p className={styles.description}>Fylgstu með tekjum og útgjöldum, sjáðu næstu reikninga og haltu utan um sparnaðinn þinn.</p>
            <div className={styles.sample} aria-label="Dæmi um yfirlit með tilbúnum sýnigögnum">
              <div className={styles.sampleHeader}><span>Mánuðurinn í yfirliti</span><span>Sýnigögn</span></div>
              <dl><div><dt>Tekjur</dt><dd>820.000 kr.</dd></div><div><dt>Útgjöld</dt><dd>486.600 kr.</dd></div><div className={styles.sampleNet}><dt>Afkoma</dt><dd>333.400 kr.</dd></div></dl>
              <p>Afkoma er tekjur að frádregnum skráðum útgjöldum.</p>
            </div>
            <Link href="/demo" className={`${styles.demoLink} focus-ring`}>Prófaðu með sýnigögnum <span aria-hidden="true">↗</span></Link>
          </div>
          <p className={styles.asideNote}>Færslur · Reikningar · Sparnaður</p>
        </aside>
        <main className={styles.main}>
          <div data-scroll-reveal="" className={styles.mainHeader}>
            <Link href="/" className={`${styles.mobileBrand} ${styles.brand} focus-ring`}><BrandMark /><span>Mín fjármál</span></Link>
            <Link href="/" className={`${styles.back} focus-ring`}><ArrowLeftIcon size={15} aria-hidden="true" /> Forsíða</Link>
          </div>
          <div data-scroll-reveal="" className={styles.formContainer}>{children}</div>
        </main>
      </div>
      <AppFooter mode="auth" showProductLinks={false} />
    </div>
  );
}
