import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BrandMark } from "@/components/brand-mark";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Mín fjármál | Skýrari yfirsýn yfir peningana þína",
  description: "Skráðu tekjur og útgjöld í íslenskum krónum, flyttu inn útgjöld úr CSV eða Excel og fylgstu með reikningum og sparnaði."
};

const features = [
  { number: "01", title: "Sjáðu hvert peningarnir fara.", label: "Færslur", description: "Skráðu tekjur og útgjöld eða flyttu inn útgjöld úr CSV eða Excel. Finndu færslurnar aftur eftir dagsetningu eða flokki." },
  { number: "02", title: "Hafðu næstu greiðslur á hreinu.", label: "Reikningar", description: "Haltu utan um mánaðarlega reikninga og sjáðu hvað er greitt og hvað er eftir." },
  { number: "03", title: "Gefðu sparnaðinum tilgang.", label: "Sparnaður", description: "Skiptu sparnaðinum niður, settu þér markmið og fylgstu með því sem þú hefur lagt til hliðar." }
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <header data-scroll-reveal="" className={styles.header}>
        <Link href="/" className={`${styles.brand} focus-ring`} aria-label="Mín fjármál – forsíða"><BrandMark /><span>Mín fjármál</span></Link>
        <nav className={styles.nav} aria-label="Aðalvalmynd">
          <Link href="/demo" className={`${styles.demoNav} focus-ring`}>Sýnigögn</Link>
          <Link href="/login" className={`${styles.login} focus-ring`}>Skrá inn</Link>
          <Link href="/signup" className={`${styles.navCta} focus-ring`}>Stofna aðgang <ArrowRightIcon size={16} aria-hidden="true" /></Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="home-title">
          <div data-scroll-reveal="" className={styles.heroCopy}>
            <p className={styles.eyebrow}>Persónuleg fjármál. Á íslensku.</p>
            <h1 id="home-title">Peningarnir þínir.<br /><em>Skýrari mynd.</em></h1>
            <p className={styles.intro}>Sjáðu hvað kemur inn, hvað fer út og hvað bíður fram undan. Færslur, reikningar og sparnaður í einu yfirliti.</p>
            <div className={styles.heroActions}>
              <Link href="/signup" className={`${styles.primary} focus-ring`}>Stofna aðgang <ArrowRightIcon size={18} aria-hidden="true" /></Link>
              <Link href="/demo" className={`${styles.textLink} focus-ring`}>Skoða sýnigögn <ArrowRightIcon size={17} aria-hidden="true" /></Link>
            </div>
            <p className={styles.tryNote}>Handvirk skráning og innflutningur útgjalda · Íslenskar krónur (ISK)</p>
          </div>

          <div data-scroll-reveal="" className={styles.productWrap}>
            <div className={styles.previewCaption}><span>Yfirlit yfir mánuðinn</span><span>Sýnigögn</span></div>
            <section className={styles.product} aria-label="Dæmi um fjármálayfirlit með tilbúnum sýnigögnum">
              <div className={styles.productTop}><span className={styles.productBrand}><BrandMark />Mín fjármál</span><span>September</span></div>
              <div className={styles.previewNav} aria-hidden="true"><span>Yfirlit</span><span>Færslur</span><span>Reikningar</span><span>Sparnaður</span></div>
              <div className={styles.previewContent}>
                <div className={styles.previewSummary}>
                  <p className={styles.previewLabel}>Afkoma mánaðarins</p>
                  <p className={styles.previewAmount}>333.400 <span>kr.</span></p>
                  <p className={styles.previewDefinition}>Tekjur að frádregnum skráðum útgjöldum</p>
                  <dl className={styles.previewMetrics}><div><dt>Tekjur</dt><dd>820.000 kr.</dd></div><div><dt>Útgjöld</dt><dd>486.600 kr.</dd></div></dl>
                </div>
                <div className={styles.previewRows}>
                  <div className={styles.previewSectionTitle}><h2>Nýjustu færslur</h2><span>September</span></div>
                  {[{ title: "Matvöruverslun", category: "Matur og heimili", date: "15. sep.", amount: "−12.840 kr." }, { title: "Mánaðarlaun", category: "Tekjur", date: "1. sep.", amount: "+820.000 kr." }, { title: "Húsnæðisgreiðsla", category: "Húsnæði", date: "1. sep.", amount: "−245.000 kr." }].map((row) => (
                    <div className={styles.previewRow} key={row.title}><div><strong>{row.title}</strong><span>{row.category}</span></div><span className={styles.previewDate}>{row.date}</span><b data-positive={row.category === "Tekjur"}>{row.amount}</b></div>
                  ))}
                </div>
                <div className={styles.previewGoal}><div><span>Sparnaðarmarkmið</span><strong>Varasjóður</strong></div><p>720.000 <span>/ 1.000.000 kr.</span></p><div className={styles.goalTrack}><span /></div><span className={styles.goalPercent}>72% af markmiði</span></div>
              </div>
            </section>
          </div>
        </section>

        <section data-scroll-reveal="" className={styles.gettingStarted} aria-labelledby="getting-started-title">
          <div><p className={styles.eyebrow}>Áður en þú byrjar</p><h2 id="getting-started-title">Þú skráir gögnin.<br />Við setjum þau í samhengi.</h2></div>
          <div className={styles.practicalInfo}>
            <p><strong>Engin bankatenging.</strong> Þú skráir færslur handvirkt eða hleður upp CSV- eða Excel-skrá. Innflutningur tekur aðeins með útgjöld; tekjur eru skráðar sérstaklega.</p>
            <p><strong>Allar upphæðir í ISK.</strong> Yfirlitið byggir á skráðum gögnum og sýnir ekki staðfesta bankainnstæðu. Ógreiddir reikningar eru sýndir sérstaklega.</p>
            <p>Í núverandi útgáfu er ekkert áskriftar- eða greiðsluferli. Sýningarútgáfan notar tilbúin gögn og þarfnast ekki aðgangs.</p>
            <div><Link href="/help" className="focus-ring">Leiðbeiningar um fyrstu skrefin <ArrowRightIcon size={15} aria-hidden="true" /></Link><Link href="/privacy" className="focus-ring">Um gögnin þín</Link></div>
          </div>
        </section>

        <section className={styles.features} aria-labelledby="features-title">
          <div data-scroll-reveal="" className={styles.sectionIntro}><p className={styles.eyebrow}>Frá yfirliti í daglegar venjur</p><h2 id="features-title">Það sem skiptir máli,<br />á sínum stað.</h2></div>
          <div className={styles.featureList}>{features.map((feature) => <article data-scroll-reveal="" className={styles.feature} key={feature.number}><span className={styles.featureNumber}>{feature.number}</span><div><p className={styles.featureLabel}>{feature.label}</p><h3>{feature.title}</h3><p>{feature.description}</p></div></article>)}</div>
        </section>

        <section data-scroll-reveal="" className={styles.closing} aria-labelledby="closing-title"><div><p className={styles.eyebrow}>Byrjaðu á yfirsýninni</p><h2 id="closing-title">Kynnstu þínum fjármálum.</h2><p>Skoðaðu hvernig þetta virkar áður en þú stofnar aðgang.</p></div><Link href="/demo" className={`${styles.primary} focus-ring`}>Opna sýningarútgáfu <ArrowRightIcon size={18} aria-hidden="true" /></Link></section>
      </main>

      <footer data-scroll-reveal="" className={styles.footer}><Link href="/" className={`${styles.brand} focus-ring`}><BrandMark /><span>Mín fjármál</span></Link><span>© 2026 Bjartur Blær Gunnlaugsson</span><nav aria-label="Valmynd í síðufæti"><Link href="/demo">Sýnigögn</Link><Link href="/help">Leiðbeiningar</Link><Link href="/privacy">Persónuvernd</Link><Link href="/login">Innskráning</Link></nav></footer>
    </div>
  );
}
