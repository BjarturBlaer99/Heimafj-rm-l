import Link from "next/link";
import { InformationPage } from "@/components/information-page";
import { privacyContact } from "@/lib/privacy-config";

export const metadata = { title: "Leiðbeiningar og aðstoð | Mín fjármál" };

export default function HelpPage() {
  const supportEmail = process.env.SUPPORT_EMAIL || privacyContact.email;
  return <InformationPage title="Leiðbeiningar og aðstoð" description="Hvernig þú skráir færslur, heldur utan um reikninga og sparar.">
    <section data-scroll-reveal=""><h2>Svona byrjarðu</h2><ol><li><Link href="/transactions#new-transaction">Skráðu tekjur og útgjöld</Link> eða flyttu inn útgjöld úr bankaskrá.</li><li><Link href="/bills">Bættu við reikningum</Link> og tengdu þá við greiðslur.</li><li><Link href="/savings-goals">Settu þér sparnaðarmarkmið</Link> með markdegi.</li></ol><p>Allar upphæðir eru í krónum. Síðan tengist ekki bankanum og umreiknar ekki aðra gjaldmiðla.</p></section>
    <section id="import" data-scroll-reveal=""><h2>Flytja inn útgjöld</h2><p>Skráin þarf dálka fyrir dagsetningu, lýsingu og upphæð (CSV eða Excel). Neikvæðar upphæðir verða útgjöld. Jákvæðum upphæðum er sleppt, svo tekjur skráirðu sérstaklega.</p><ol><li>Veldu skrá undir <Link href="/transactions#import-transactions">Flytja inn skrá</Link>.</li><li>Veldu dálkana fyrir dagsetningu, lýsingu og upphæð.</li><li>Farðu yfir flokkana, og sérstaklega færslur merktar ógildar eða tvíteknar.</li><li>Veldu færslurnar og staðfestu.</li></ol><p>Vafrinn getur munað dálkavalið og flokkunarreglur. Skráin sjálf er ekki vistuð.</p></section>
    <section data-scroll-reveal=""><h2>Finna og flokka færslur</h2><p>Undir Færslur velurðu mánuð, tímabil eða allar færslur. Þú getur breytt færslu eða valið nokkrar og flokkað þær saman.</p><p>Sumir flokkar eru bara fyrir tekjur eða bara fyrir útgjöld. Eigin flokkum bætirðu við í <Link href="/settings#category-settings">stillingum</Link>.</p></section>
    <section data-scroll-reveal=""><h2>Reikningar og greiðslur</h2><p>Ef greiðslan er þegar skráð skaltu tengja færsluna við reikninginn, svo hún teljist ekki tvisvar. Annars skráirðu greiðsluna um leið og þú merkir reikninginn greiddan.</p><p>„Ógreitt“ þýðir bara að greiðslan hefur ekki verið skráð hér. Síðan sér ekki hvað er greitt í bankanum. Ef þú aftengir greiðslu helst færslan inni.</p><p>Þú getur afritað reikninga úr fyrri mánuði. Greiðslur fylgja ekki með.</p></section>
    <section data-scroll-reveal=""><h2>Sparnaðaráætlun</h2><p>Mánaðarlegt framlag er upphæðin sem vantar, deilt á mánuðina fram að markdegi (þessi mánuður meðtalinn). Ekki er gert ráð fyrir ávöxtun.</p></section>
    <section data-scroll-reveal=""><h2>Sækja gögn eða eyða aðgangi</h2><p>Undir <Link href="/settings#data-settings">Gögn og aðstoð</Link> sækirðu færslur sem CSV eða öll gögnin sem JSON. Stillingar sem eru bara í vafranum fylgja ekki með.</p><p>Þar geturðu líka beðið um að aðganginum verði eytt, eða hætt við. Stjórnandi afgreiðir beiðnina, svo gögnunum er ekki eytt strax.</p><p><Link href="/privacy">Nánar um meðferð gagna</Link>.</p></section>
    <section data-scroll-reveal=""><h2>Vantar þig aðstoð?</h2>{supportEmail ? <p>Sendu póst á <a href={`mailto:${supportEmail}`}>{supportEmail}</a> og segðu hvað gerðist.</p> : <p>Upplýsingar um síðuna eru á <a href="https://github.com/BjarturBlaer99/Heimafj-rm-l" target="_blank" rel="noreferrer">síðu verkefnisins</a>.</p>}<p>Ekki birta lykilorð eða fjármálaupplýsingar þegar þú tilkynnir villu opinberlega.</p></section>
  </InformationPage>;
}
