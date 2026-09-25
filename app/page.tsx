import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BrandMark } from "@/components/brand-mark";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Mín fjármál | Yfirsýn yfir fjármálin þín",
  description: "Haltu utan um tekjur, útgjöld, reikninga og sparnað. Skráðu færslur beint á síðuna eða flyttu inn útgjöld úr CSV- eða Excel-skrá."
};

const features = [
  { number: "01", title: "Sjáðu í hvað peningarnir fara.", label: "Færslur", description: "Skráðu tekjur og útgjöld eða flyttu inn útgjöld úr CSV- eða Excel-skrá. Skoðaðu síðan færslurnar eftir dagsetningu eða flokki." },
  { number: "02", title: "Fylgstu með næstu reikningum.", label: "Reikningar", description: "Haltu utan um reikninga mánaðarins, skráðu greiðslur og sjáðu hvað er eftir að greiða." },
  { number: "03", title: "Leggðu til hliðar fyrir því sem þú vilt.", label: "Sparnaður", description: "Settu þér sparnaðarmarkmið og sjáðu hvað vantar upp á. Skráðu það sem þú leggur til hliðar og fylgstu með stöðunni." }
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <header data-scroll-reveal="" className={styles.header}>
        <Link href="/" className={`${styles.brand} focus-ring`} aria-label="Mín fjármál – forsíða"><BrandMark /><span>Mín fjármál</span></Link>
        <nav className={styles.nav} aria-label="Aðalvalmynd">
          <Link href="/demo" className={`${styles.demoNav} focus-ring`}>Sýnigögn</Link>
          <Link href="/login" className={`${styles.login} focus-ring`}>Innskráning</Link>
          <Link href="/signup" className={`${styles.navCta} focus-ring`}>Stofna aðgang <ArrowRightIcon size={16} aria-hidden="true" /></Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="home-title">
          <div data-scroll-reveal="" className={styles.heroCopy}>
            <p className={styles.eyebrow}>Persónuleg fjármál á íslensku</p>
            <h1 id="home-title">Hafðu yfirsýn<br /><em>yfir fjármálin þín.</em></h1>
            <p className={styles.intro}>Skráðu tekjur og útgjöld, fylgstu með reikningum og sjáðu hvernig sparnaðurinn gengur.</p>
            <div className={styles.heroActions}>
              <Link href="/signup" className={`${styles.primary} focus-ring`}>Stofna aðgang <ArrowRightIcon size={18} aria-hidden="true" /></Link>
              <Link href="/demo" className={`${styles.textLink} focus-ring`}>Skoða sýnigögn <ArrowRightIcon size={17} aria-hidden="true" /></Link>
            </div>
            <p className={styles.tryNote}>Þú skráir færslurnar eða flytur þær inn úr skrá. Allar upphæðir eru í krónum.</p>
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
          <div><p className={styles.eyebrow}>Gott að vita</p><h2 id="getting-started-title">Yfirlitið byrjar<br />á færslunum þínum.</h2></div>
          <div className={styles.practicalInfo}>
            <p><strong>Síðan tengist ekki bankanum þínum.</strong> Þú slærð inn færslur eða flytur inn útgjöld úr CSV- eða Excel-skrá. Tekjur þarf að skrá sérstaklega.</p>
            <p><strong>Upphæðir eru í íslenskum krónum.</strong> Yfirlitið miðast við það sem þú hefur skráð og sýnir því ekki staðfesta bankainnstæðu. Ógreiddir reikningar birtast sérstaklega.</p>
            <p>Ekki er tekið við áskriftum eða greiðslum í núverandi útgáfu. Þú getur skoðað síðuna með tilbúnum sýnigögnum án þess að stofna aðgang.</p>
            <div><Link href="/help" className="focus-ring">Hvernig byrja ég? <ArrowRightIcon size={15} aria-hidden="true" /></Link><Link href="/privacy" className="focus-ring">Hvernig eru gögnin mín geymd?</Link></div>
          </div>
        </section>

        <section className={styles.features} aria-labelledby="features-title">
          <div data-scroll-reveal="" className={styles.sectionIntro}><p className={styles.eyebrow}>Færslur, reikningar og sparnaður</p><h2 id="features-title">Hvað fór út?<br />Hvað er fram undan?</h2></div>
          <div className={styles.featureList}>{features.map((feature) => <article data-scroll-reveal="" className={styles.feature} key={feature.number}><span className={styles.featureNumber}>{feature.number}</span><div><p className={styles.featureLabel}>{feature.label}</p><h3>{feature.title}</h3><p>{feature.description}</p></div></article>)}</div>
        </section>

        <section data-scroll-reveal="" className={styles.closing} aria-labelledby="closing-title"><div><p className={styles.eyebrow}>Prófaðu síðuna</p><h2 id="closing-title">Skoðaðu áður en þú byrjar.</h2><p>Kynntu þér yfirlitið með sýnigögnum. Þú þarft ekki að skrá þig inn.</p></div><Link href="/demo" className={`${styles.primary} focus-ring`}>Skoða sýnigögn <ArrowRightIcon size={18} aria-hidden="true" /></Link></section>
      </main>

      <footer data-scroll-reveal="" className={styles.footer}><Link href="/" className={`${styles.brand} focus-ring`}><BrandMark /><span>Mín fjármál</span></Link><span>© 2026 Bjartur Blær Gunnlaugsson</span><nav aria-label="Valmynd í síðufæti"><Link href="/demo">Sýnigögn</Link><Link href="/help">Leiðbeiningar</Link><Link href="/privacy">Persónuvernd</Link><Link href="/login">Innskráning</Link></nav></footer>
    </div>
  );
}
