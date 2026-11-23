# Lokayfirferð 7. október 2026

Breytingarnar voru birtar í production 8. október 2026 eftir samþykki eigandans. Póstsniðin eru vistuð og ný endurstillingarbeiðni staðfest í vefviðmótinu 9. október. Eigandinn staðfesti sama dag að nýja lykilorðið virki og yfirlitið opnist. Prófað var með tilbúnum gögnum á production-smíð vefsins, með staðbundinni eftirlíkingu af Supabase og raunverulegum tímabundnum PostgreSQL. Engum fjármálagögnum raunverulegra notenda var breytt. Nýskráning og sending endurstillingarpósts voru einnig prófuð á production með netfangi sem eigandinn valdi.

## Production-útgáfa, uppfært 9. október

- Git-útgáfa: `f8ba601a472f515c4def9cb46812d063e287640a`, á grein `codex/web-release-2026-09-18`, send á GitHub.
- Gagnagrunnsuppfærslan `supabase/import-deduplication-update.sql` var keyrð á production-verkefninu `gtgqxgddlqcvspegvxzt` áður en vefurinn var birtur. Fyrir og eftir voru 742 færslur; einkvæmi vísirinn og uppfærslukveikjan voru virk. Engum færslum var eytt eða endurskrifuð gögn þeirra.
- Vercel smíðaði nýja útgáfu með production-stillingum. Útgáfan `dpl_82Z5PBjhgTZSzUyfFHhEKDwB3Hit` sýndi Ready og fékk lénið [minfjarmal.vercel.app](https://minfjarmal.vercel.app/). Staðbundna prófunarsmíðin var ekki notuð.
- Allar 35 óinnskráðar HTTP-athuganir stóðust eftir birtingu, þar á meðal aðgangsvörn tólf einkasíðna og CSV-/JSON-útflutnings. Miðgildi afhendingartíma opinberra síðna var 62–280 ms í þremur mælingum á síðu; þetta er ekki mæling á birtingarhraða í vafra eða álagshraða.
- Ógildur endurstillingarlykill á production gaf 307 á `/login?error=invalid_auth_link`, engan aðgangskökusvarhaus, `Cache-Control: private, no-store, max-age=0` og `Referrer-Policy: no-referrer`.
- Endurstillingar- og staðfestingarpóstsniðin voru vistuð í Supabase með íslenskum titlum og einnota tenglum á production-síðuna. Vistun var staðfest með óvirkum Save changes-hnappi og engum óvistuðum breytingum.
- Nýr endurstillingarpóstur var pantaður 9. október á prófunarnetfangið sem eigandinn samþykkti. Vefurinn sýndi staðfestingu efst. Aðstoðarmaðurinn sló ekki inn eða vistaði nýtt lykilorð.
- Eigandinn lauk raunverulegu póstprófi 9. október og svaraði: „Nýja lykilorðið virkar og yfirlitið opnast“. Endurstillingarferlið telst því staðfest á production. Hvort hann notaði annan vafra eða tæki var ekki sérstaklega staðfest.
- Eigandinn prófaði einnig nýskráningu 9. október og staðfesti: „var að testa nýskráningu hún virkar“. Nýskráningarprófið er skráð sem staðist samkvæmt staðfestingu eigandans; aðstoðarmaðurinn fylgdist ekki sjálfur með þeirri prófun.
- Farsímaappið var ekki tekið með í Git-útgáfuna. Prófunarskýrslur og myndir eru útilokaðar úr Vercel-upphleðslum.

## Breytingar

- Textar á forsíðu, innskráningu, fjármálayfirlitum, reikningum, sparnaði, mörkuðum, fasteignum, stillingum og í leiðbeiningum voru yfirfarnir. Óskýrt orðalag var stytt og hugtök um áætlanir, afkomu og framlög samræmd. Fyrirliggjandi fyrirvarar um gögn og persónuvernd eru áfram til staðar.
- Einn hnappur flytur inn allar valdar nýjar útgjaldafærslur þegar lestur og samanburður eru tilbúin. Ekki þarf að staðfesta hverja færslu eða hverja síðu sérstaklega.
- Færslum með sömu dagsetningu, upphæð og lýsingu er sleppt sjálfkrafa. Lýsingar eru bornar saman óháð há-/lágstöfum og endurteknum bilum. Þetta nær bæði til endurtekninga innan skrár og færslna sem eru þegar vistaðar. Samanburður er endurtekinn á þjóninum við vistun.
- Notandi getur áfram breytt flokkun eða sleppt einstökum nýjum færslum. Tvær aðskildar greiðslur með nákvæmlega sömu auðkennum þarf að skrá sérstaklega ef þær eiga báðar að teljast með.
- Staðfestingarskilaboð birtast efst og miðjuð á öllum skjástærðum, líka eftir innflutning, niðurhal og breytingar á aðgangi. Skjálesarastuðningur, lokunarhnappur og hlé á tímamæli við fókus eru varðveitt.
- Mánuðir án heildaráætlunar sýna nú „Engin áætlun“ og strik í samanburðardálkum. Þeir eru ekki merktir yfir áætlun.
- Jákvæðar og neikvæðar hálfar krónur námundast nú með sama hætti. Vistuðum upphæðum er ekki breytt.
- Samtímis innflutningur úr ólíkum lotum var endurtekinn og villa staðfest: tvær lotur gátu vistað sömu færslu. Nýr einkvæmur samanburðarlykill í gagnagrunninum kemur í veg fyrir það; þjónninn endurtekur samanburð eftir árekstur og flytur inn þær nýju færslur sem eftir standa. Handvirkar eins færslur eru enn leyfðar og breyting á innfluttri færslu losar eldri lykilinn. Gagnagrunnsuppfærslan er virk í production.
- Móttaka pósttengla styður nú einnota tölvupóstslykla án þess að þurfa gögn úr upprunalega vafranum. Samþættingarprófin staðfesta að endurstilling fari á rétt eyðublað og að ógildir og notaðir lyklar gefi villu. Fyrri tenglar eru áfram studdir. Ný póstsnið fylgja verkefninu og hafa verið vistuð í Supabase.
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

Eftir birtingu prófaði eigandinn nýskráningu sjálfur og staðfesti 9. október að hún virkaði. Sú síðari staðfesting lokar nýskráningarprófinu sem áður var óstaðfest.

Endurstillingarpóstur var pantaður í gegnum eldri production-útgáfuna. Supabase skráði `/recover` með 200-svari og eigandinn staðfesti móttöku. Tengillinn opnaði hins vegar innskráningu í stað endurstillingar. Sniðið notaði þá `ConfirmationURL` og vefurinn aðeins PKCE-kóðaskipti, sem krefjast upprunalega vafrans. Þetta er samrýmanlegt lýstri bilun; nákvæm villuskrá úr vafra eigandans var ekki tiltæk.

Nýi kóðinn og póstsniðin leysa þessa takmörkun með staðfestingu einnota póstlykils. Fimm samþættingarpróf staðfesta ferlið með tilbúnum Auth-bakenda, þar á meðal nýskráningu, endurstillingu, endurnotkun tengils, ógildan lykil og aðgang að endurstillingarsíðu án innskráningar. Raunverulegt endurpróf á Supabase tókst eftir útgáfu og uppfærslu póstsniðanna: eigandinn staðfesti 9. október að nýja lykilorðið virkaði og yfirlitið opnaðist. Almennar öryggisstillingar voru einnig leiðréttar svo tilvísunarhausar af auðkenningarslóðum beri ekki með sér póstlykla.

## Hraði og takmörk mælinga

Staðbundin síðuskipti tóku um 0,12–0,48 sekúndur að aðalfyrirsögn. Þetta eru stakar mælingar með tilbúnum staðbundnum bakenda og innihalda kostnað vafratólsins; þær lýsa ekki gagnagrunnshraða production. Markaðs- og fasteignagögn geta hlaðist eftir fyrirsögninni.

Á núverandi production-síðu var miðgildi afhendingar opinberra HTML-síðna 74–445 ms í þremur mælingum á síðu. Hægasta fyrsta mælingin á forsíðu var 1.358 ms. Þetta eru HTTP-mælingar frá þessari tölvu, ekki Core Web Vitals eða álagspróf.

## Enn óstaðfest

- Raunverulegur iPhone/Safari og Android, snertiskrun og innbyggðir dagsetningarvalgluggar.
- Raunverulegt póstpróf í öðrum vafra eða tæki og endurnotkun sama tengils. Heildarendursetning og aðgangur að yfirliti voru staðfest af eigandanum; vafra-/tækjaskipti voru ekki sérstaklega staðfest. Tilbúnu samþættingarprófin ná yfir tengil án fyrirliggjandi vafraköku og endurnotkun hans.
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
- [Production-athuganir eftir birtingu](2026-10-08/production-http.json)
- [Öryggissvör nýja pósttengilsins](2026-10-08/production-callback-headers.txt)
- [Gagnagrunnsuppfærsla](2026-10-08/production-migration.jpg)
- [Tilbúin production-útgáfa](2026-10-08/production-ready.jpg)
- [Vistað staðfestingarpóstsnið](2026-10-09/signup-template.jpg)
- [Staðfesting nýrrar endurstillingarbeiðni](2026-10-09/recovery-request.jpg)

## Útgáfuröð

Útgáfuröðinni var fylgt: fyrst `supabase/import-deduplication-update.sql`, síðan ný production-smíð í Vercel og loks póstsniðin í Supabase samkvæmt [útgáfuleiðbeiningunum](../../supabase/email-templates/README.md). Ekki má síðar rúlla vefnum aftur á útgáfu án stuðnings við nýju tenglana án þess að samræma póstsniðin; þegar sendir nýir tenglar þurfa áfram nýja móttökukóðann.

Staðbundna .next-smíðin notar tilbúinn loopback-bakenda fyrir prófun. Vercel smíðaði verkefnið sérstaklega með production-stillingum þess.
