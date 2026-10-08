# Lokayfirferð 7. október 2026

Breytingarnar eru staðbundnar og hafa ekki verið birtar í production. Prófað var með tilbúnum gögnum á production-smíð vefsins, með staðbundinni eftirlíkingu af Supabase og raunverulegum tímabundnum PostgreSQL. Engum fjármálagögnum raunverulegra notenda var breytt. Nýskráning og sending endurstillingarpósts voru einnig prófuð á production með netfangi sem eigandinn valdi.

## Breytingar

- Textar á forsíðu, innskráningu, fjármálayfirlitum, reikningum, sparnaði, mörkuðum, fasteignum, stillingum og í leiðbeiningum voru yfirfarnir. Óskýrt orðalag var stytt og hugtök um áætlanir, afkomu og framlög samræmd. Fyrirliggjandi fyrirvarar um gögn og persónuvernd eru áfram til staðar.
- Einn hnappur flytur inn allar valdar nýjar útgjaldafærslur þegar lestur og samanburður eru tilbúin. Ekki þarf að staðfesta hverja færslu eða hverja síðu sérstaklega.
- Færslum með sömu dagsetningu, upphæð og lýsingu er sleppt sjálfkrafa. Lýsingar eru bornar saman óháð há-/lágstöfum og endurteknum bilum. Þetta nær bæði til endurtekninga innan skrár og færslna sem eru þegar vistaðar. Samanburður er endurtekinn á þjóninum við vistun.
- Notandi getur áfram breytt flokkun eða sleppt einstökum nýjum færslum. Tvær aðskildar greiðslur með nákvæmlega sömu auðkennum þarf að skrá sérstaklega ef þær eiga báðar að teljast með.
- Staðfestingarskilaboð birtast efst og miðjuð á öllum skjástærðum, líka eftir innflutning, niðurhal og breytingar á aðgangi. Skjálesarastuðningur, lokunarhnappur og hlé á tímamæli við fókus eru varðveitt.
- Mánuðir án heildaráætlunar sýna nú „Engin áætlun“ og strik í samanburðardálkum. Þeir eru ekki merktir yfir áætlun.
- Jákvæðar og neikvæðar hálfar krónur námundast nú með sama hætti. Vistuðum upphæðum er ekki breytt.
- Samtímis innflutningur úr ólíkum lotum var endurtekinn og villa staðfest: tvær lotur gátu vistað sömu færslu. Nýr einkvæmur samanburðarlykill í gagnagrunninum kemur í veg fyrir það; þjónninn endurtekur samanburð eftir árekstur og flytur inn þær nýju færslur sem eftir standa. Handvirkar eins færslur eru enn leyfðar og breyting á innfluttri færslu losar eldri lykilinn. Gagnagrunnsuppfærslan er tilbúin en ekki keyrð í production.
- Móttaka pósttengla styður nú einnota tölvupóstslykla án þess að þurfa gögn úr upprunalega vafranum. Endurstilling fer alltaf á rétt eyðublað; ógildir og notaðir lyklar gefa villu. Fyrri tenglar eru áfram studdir. Ný póstsnið fylgja verkefninu en hafa ekki verið vistuð í Supabase.
- Nýskráningarskilaboðin skýra að fólk með fyrirliggjandi aðgang geti skráð sig inn eða endurstillt lykilorð. Þau lofa ekki lengur nýjum staðfestingarpósti fyrir aðgang sem hefur þegar verið staðfestur.

## Sjálfvirkar prófanir

| Athugun | Niðurstaða |
| --- | --- |
| Forritsprófanir | 185 staðist, 0 mistókust |
| Greiðslur og sparnaður í tímabundnum PostgreSQL | 33 staðist |
| Aðskilnaður gagna og tengdar færslur í PostgreSQL | 11 staðist |
| Raunverulegar innflutningsaðgerðir gegn PostgreSQL | 12 staðist |
| Nýir pósttenglar í fullsmíðaðri staðbundinni útgáfu | 5 staðist |
| CSV-/JSON-útflutningur í fullsmíðaðri staðbundinni útgáfu | 5 staðist |
| Staðbundnar HTTP-athuganir | 35 staðist |
| Production HTTP-athuganir, aðeins óinnskráðar lesbeiðnir | 35 staðist |
| Lint og TypeScript | Staðist |
| Production-smíð | Staðist |
| Öryggisathugun á production-pökkum | 0 þekktir veikleikar tilkynntir af npm audit |

Prófanir á innflutningi ná meðal annars yfir 1.000 færslur, rangar dagsetningar, upphæðir, tekjur, núllupphæðir, aðgangsskipti, óheimila flokka, tvítekningar, endurtekna skrá, innflutning eftir óvíst netsvar og samtímis staðfestingu bæði sömu og ólíkra lota. Tíu ólíkar lotur með sömu færslu voru látnar komast samtímis í gegnum upphafssamanburð; gagnagrunnurinn vistaði eitt eintak og níu lotur skiluðu réttri niðurstöðu um tvítekningu. Tvær skrár með sameiginlegri færslu og einni nýrri hvor héldu öllum þremur réttum færslum. Tvö notendanúmer gátu flutt inn eins færslu sjálfstætt án þess að sjá gögn hvors annars.

## Prófanir í vafra

- Skráði inn í staðbundinn prófunaraðgang.
- Flutti inn 30 nýjar færslur með einum smelli án þess að opna aðra síðu listans. Tveimur tvítekningum og þremur ógildum eða útilokuðum línum var sleppt.
- Endurtók sama innflutning: engar nýjar færslur fundust og hnappurinn var óvirkur.
- Hlóð upp raunverulegum tilbúnum CSV- og XLSX-skrám í skráarvalinu. XLSX-prófið staðfesti lestur fyrsta vinnublaðs. Gögnin voru tilbúin prófunargögn.
- Framkallaði tímabundna vistunarvillu í innflutningi. Endurtilraun vistaði eina nýja færslu og sleppti tvítekningum.
- Skráði handvirka færslu og staðfesti að 1234567 birtist sem 1.234.567 í upphæðarreitnum.
- Skráði 25.000 kr. framlag í húsnæðissparnað og staðfesti hækkun úr 3.875.000 í 3.900.000 kr.
- Vistaði upplýsingar í stillingum og ræsti CSV-niðurhal. Staðfestingarskilaboð birtust efst í báðum tilvikum. Vafratólið náði ekki niðurhalsatburðinum sjálfum. Viðbótarpróf sótti síðan raunveruleg CSV-/JSON-svör úr smíðaða vefnum með tilbúinni innskráningu: sama færslufjölda, íslenskir stafir, öll tíu gagnasöfnin og réttur viðhengishaus staðfest. Framkölluð gagnavilla gaf 503 án hlutaskrár og endurtilraun tókst.
- Staðfesti efstu staðsetningu skilaboða eftir innflutning, nýja færslu, sparnaðarframlag, stillingavistun og niðurhal, þótt aðgerðin væri neðarlega á síðunni.
- Opnaði mánaðaryfirlit, tekjur, útgjöld, reikninga, greiningu, markaði og fasteignir. Engar JavaScript-villur sáust í vafraloggi.
- Prófaði helstu eyðublöð við umbeðna 390 px breidd og innflutning við 320 px. Ekkert lárétt yfirflæði eða reitir utan síðu. Raunveruleg efnisbreidd var mismunandi eftir vafraaðdrætti og skrunstiku; nýjustu sex-síðna mælingarnar voru 375 px, og mjósta síðari athugun 305 px.
- Endurtók innflutning eftir lagfæringuna: tvær nýjar færslur fluttar inn með einum smelli, einni tvítekningu og einni innborgun sleppt. Staðfesting birtist 16 px frá efri brún.
- Opnaði tilbúinn endurstillingartengil á staðbundnu léni án fyrirliggjandi innskráningar þar. Rétt síða, „Veldu nýtt lykilorð“, birtist og engar JavaScript-villur sáust. Ekkert raunverulegt lykilorð var slegið inn af aðstoðarmanninum.

## Raunverulegt póstpróf

Eigandinn valdi prófunarnetfang og reyndi nýskráningu. Enginn nýr staðfestingarpóstur kom. Lesathugun í Supabase sýndi að þetta var eldri aðgangur sem hafði þegar verið staðfestur 9. maí 2026; tilraunin prófaði því endurtekna skráningu en ekki stofnun nýs aðgangs.

Endurstillingarpóstur var pantaður í gegnum production-vefinn. Supabase skráði `/recover` með 200-svari og eigandinn staðfesti móttöku. Tengillinn opnaði hins vegar innskráningu í stað endurstillingar. Núverandi snið notar `ConfirmationURL` og vefurinn aðeins PKCE-kóðaskipti, sem krefjast upprunalega vafrans. Þetta er samrýmanlegt lýstri bilun; nákvæm villuskrá úr vafra eigandans var ekki tiltæk.

Nýi kóðinn og póstsniðin leysa þessa takmörkun með staðfestingu einnota póstlykils. Fimm samþættingarpróf staðfesta ferlið með tilbúnum Auth-bakenda, þar á meðal nýskráningu, endurstillingu, endurnotkun tengils, ógildan lykil og aðgang að endurstillingarsíðu án innskráningar. Raunverulegt endurpróf á Supabase verður að fara fram eftir útgáfu og uppfærslu póstsniðanna. Almennar öryggisstillingar voru einnig leiðréttar svo tilvísunarhausar af auðkenningarslóðum beri ekki með sér póstlykla.

## Hraði og takmörk mælinga

Staðbundin síðuskipti tóku um 0,12–0,48 sekúndur að aðalfyrirsögn. Þetta eru stakar mælingar með tilbúnum staðbundnum bakenda og innihalda kostnað vafratólsins; þær lýsa ekki gagnagrunnshraða production. Markaðs- og fasteignagögn geta hlaðist eftir fyrirsögninni.

Á núverandi production-síðu var miðgildi afhendingar opinberra HTML-síðna 74–445 ms í þremur mælingum á síðu. Hægasta fyrsta mælingin á forsíðu var 1.358 ms. Þetta eru HTTP-mælingar frá þessari tölvu, ekki Core Web Vitals eða álagspróf.

## Enn óstaðfest

- Raunverulegur iPhone/Safari og Android, snertiskrun og innbyggðir dagsetningarvalgluggar.
- Nýr production-aðgangur með staðfestingarpósti. Netfangið sem var prófað var þegar skráð; annar prófunaraðgangur var ekki stofnaður.
- Endurpróf á raunverulegum endurstillingarpósti eftir að nýi callback-kóðinn og póstsniðin hafa verið birt. Sending og móttaka stóðust, en núverandi production-ferli brást við opnun tengilsins.
- Álagspróf alls vefsins með mörgum samtímis notendum, raunverulegum netaðstæðum og Core Web Vitals. Samtímis gagnagrunnsinnflutningur er prófaður, en er ekki slíkt álagspróf.
- Staðbundin vafraprófun notar eftirlíkingu af Auth/REST, ekki raunverulegt Supabase staging-verkefni. PostgreSQL-prófin keyra hins vegar raunverulegar gagnagrunnsreglur.

## Gögn úr prófunum

- [Staðbundnar HTTP-niðurstöður](2026-10-07/local-http.json)
- [Production HTTP-niðurstöður](2026-10-07/production-http.json)
- [Síðuskipti og símasnið](2026-10-07/browser-results.json)
- [Nýr innflutningur](2026-10-07/import-preview.jpg)
- [Staðfesting í símasniði](2026-10-07/mobile-import-success.jpg)
- [Staðfesting sparnaðarframlags](2026-10-07/desktop-savings-success.jpg)
- [Ný pósttenglapróf](2026-10-07/local-auth.json)
- [Útflutningspróf](2026-10-07/local-exports.json)
- [Innflutningur eftir lagfæringu](2026-10-07/final-import-success.jpg)
- [Rétt endurstillingarsíða á local](2026-10-07/reset-link-fixed-local.jpg)

## Útgáfuröð

Áður en nýi innflutningskóðinn er birtur þarf að keyra `supabase/import-deduplication-update.sql`. Síðan skal birta vefinn og loks setja ný póstsnið í Supabase samkvæmt [útgáfuleiðbeiningunum](../../supabase/email-templates/README.md). Ekki uppfæra póstsnið á undan vefkóðanum: eldri vefurinn skilur ekki nýju tenglana. Engin þessara production-breytinga hefur verið framkvæmd í þessari prófunarlotu.

Staðbundna .next-smíðin notar tilbúinn loopback-bakenda fyrir prófun. Við útgáfu skal láta Vercel smíða verkefnið með production-stillingum þess, ekki senda þessa staðbundnu prebuilt-smíð.
