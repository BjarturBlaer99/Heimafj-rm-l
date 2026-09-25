# Persónuvernd fyrir almenna opnun

Staða yfirfarin 24. september 2026. Ábyrgðaraðili: **Bjartur Blær Gunnlaugsson**, **bjarturbbg@gmail.com**.

Lokaprófanir 25. september 2026: 177 sjálfvirk forritspróf, 11 ný eigandatengslapróf og 33 fyrri gagnagrunnspróf stóðust. Lint og gerðaprófun stóðust. Vafrapróf á tilbúnum aðgangi staðfesti vistaða röðun, útilokun séreignarsparnaðar úr húsnæðis- og markmiðssummu eftir endurhleðslu og óbreyttan heildarsparnað. Sparnaður og gagnastillingar flæddu ekki út fyrir 375 px breiðan skjá. Þetta var prófað í Chromium, ekki á raunverulegum iPhone.

TradingView-val var prófað í vafra: afturköllun fjarlægði innfellda gluggann og valið hélst á persónuverndarsíðunni. Ekkert innfellt efni er búið til þegar slökkt er. Grafið er á sérstöku upprunaléni, ekki keyrt sem utanaðkomandi kóði í fjármálasíðunni. Innfelld birting var enn auð í innbyggða prófunarvafranum; sama opinbera graf hlaðaðist í sérglugga. Tengill fyrir þá leið er sýnilegur eftir virkjun. **Staðfesta þarf innfelldu birtinguna í venjulegum Safari/Chrome áður en henni er lýst sem fullprófaðri.** Sex afmörkuð persónuverndarpróf voru endurkeyrð eftir þessa breytingu og stóðust.

Þetta er rekstrarskjal fyrir Mín fjármál. Kóðabreytingarnar einar staðfesta ekki að öll lagaskilyrði séu uppfyllt. **Almenn opnun bíður staðfestingar á hýsingu, samningum, varðveislu og afgreiðslu réttindabeiðna.** Við útgáfu 25. september var eigandatengslavörn sett upp í framleiðslugagnagrunni og lokað fyrir nýja notendur í Supabase Auth.

## Tilbúið í kóða

- Persónuverndarsíðan nafngreinir ábyrgðaraðila og tengilið og lýsir raunverulegri gagnavinnslu, þar á meðal forskoðun innflutnings áður en færslur eru vistaðar.
- Valfrjáls TradingView-gröf bíða eftir vali notandans. Hægt er að hafna eða afturkalla valið. Það er vistað í vafranum í allt að 180 daga; afturköllun eyðir ekki sjálfkrafa gögnum hjá TradingView.
- Gagnaútflutningur krefst staðfests aðgangs, afmarkast við viðkomandi notanda og er ekki vistaður í sameiginlegu skyndiminni. JSON inniheldur líka persónulegar sparnaðarstillingar. CSV inniheldur færslur.
- Eyðingarbeiðni og afturköllun eru vistuð með aðganginum. **Þetta er handvirkt afgreiðsluferli: engin sjálfvirk eyðing eða tölvupóstsending fer fram.**
- Ný gagnagrunnsbreyting ver gegn tengingum færslna, áætlana og reikninga við flokk annars notanda og sparnaðarframlaga við markmið annars notanda. Hún var sett upp í framleiðslu 25. september 2026.
- Nýskráningarform og aðgerð eru lokuð nema rekstrarupplýsingar hafi verið fylltar út og sérstaklega opnað fyrir nýskráningu. Þetta er útgáfuvörn í vefnum, ekki lögfræðilegt samþykki eða Supabase-stilling.

## Skilyrði sem þarf að ljúka áður en nýskráning opnar

| Verkefni | Sönnun sem þarf að varðveita | Staða |
| --- | --- | --- |
| Staðfesta Vercel-áskrift og gildan vinnslusamning | Heiti áskriftar, samningsútgáfa og gögn um gildistöku | Óstaðfest |
| Leiða til lykta samræmi við skilmála um viðkvæm gögn | Skrifleg niðurstaða um raunverulegt efni innflutnings og færslulýsinga, samþykktir skilmálar eða breytt gagnavinnsla | Ólokið |
| Ganga frá Supabase-vinnslusamningi | Gildur samningur, verkefni og undirvinnsluaðilar | Óstaðfest |
| Skrá raunverulega vistunarstaði og millilandaflutning | Svæði gagnagrunns, keyrsla vefþjóns, afrit, annálar, stuðningsaðgangur og gildar verndarráðstafanir | Óstaðfest |
| Ákveða og framkvæma varðveislureglur | Tímabil og eyðingarferli fyrir afrit, annála og erindi, ásamt ábyrgð og prófun | Ólokið |
| Tryggja trúnað og samningsgrundvöll tölvupósts | Staðfest þjónustutegund, skilmálar, aðgangsstýring, varðveisla og örugg afhending gagna | Óstaðfest |
| Taka réttindabeiðnir í reglulega afgreiðslu | Nafngreindur ábyrgðaraðili, dagleg yfirferð, beiðnaskrá og prófuð eyðing | Ólokið |
| Ljúka áhættumati og vinnsluskrá | Samþykkt mat, ákvörðun um MÁP/persónuverndarfulltrúa og skráð eftirstæð áhætta | Ólokið |
| Staðfesta aðgangsvörn í raunverulegu prófunarumhverfi | Tvær tilbúnar notendaskrár, gagnagrunnsbreytingar og neikvæð aðgangspróf | Bíður uppsetningar |

Fjárhagsfærslur geta afhjúpað heilsu, trú eða stéttarfélagsaðild. Það er því ekki nóg að flokka allan gagnagrunninn sem venjulegar fjárhagsupplýsingar án þess að meta innihaldið. Löggjöfin skilgreinir sérstaka flokka persónuupplýsinga og gerir kröfur um vinnsluheimild, öryggi, gagnsæi og ábyrgðarskyldu. [Lög nr. 90/2018 og meðfylgjandi persónuverndarreglugerð](https://www.althingi.is/lagas/nuna/2018090.html).

### Þjónustuveitendur

**Vercel:** DPA-síðan sem var skoðuð gildir fyrir Pro og Enterprise og bannar viðkvæm gögn eða sérstaka flokka í Customer Data. Ekki gera ráð fyrir að Hobby falli undir sama samning eða að Pro eitt og sér leysi innihaldsvandann. Færslulýsingar fara um vefþjóninn, líka í tvítekningarathugun innflutnings. Ábyrgðaraðili þarf því að staðfesta viðeigandi þjónustu/skilmála og raunverulega gagnavinnslu áður en almenningi er boðið að senda bankagögn. Almennt viðvörunarorð í viðmótinu leysir þetta ekki eitt og sér. [Vercel Data Processing Addendum, Schedule 1 §6 og gildissvið](https://vercel.com/legal/dpa).

**Supabase:** Staðfesta þarf nákvæmt verkefnissvæði og gildan DPA. Svæði aðalgagnagrunns segir ekki eitt og sér til um afrit, annála, utanaðkomandi útflutning, keyrslu Edge Functions eða aðgang undirvinnsluaðila. Skrá þarf þá þætti sérstaklega; ekki birta fullyrðingu um að öll gögn haldist innan EES án staðfestingar. [Supabase GDPR-leiðbeiningar](https://supabase.com/docs/guides/security/gdpr-compliance).

**Afrit:** Supabase lýsir mismunandi daglegri afritavarðveislu eftir áskrift, auk sérstaks PITR. Því má ekki velja tilbúið tímabil fyrir þessa uppsetningu. Eyðing einstaklings úr virka gagnagrunninum jafngildir ekki eyðingu úr öllum eldri afritum. [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups).

**Tölvupóstur:** Netfangið er staðfest af ábyrgðaraðila en samningur þess hefur ekki verið yfirfarinn. Ekki álykta um samningsvernd út frá `@gmail.com` einu saman: Google býður meðal annars Workspace Personal með eigin viðbótarskilmálum. Staðfesta þarf hvaða þjónusta og samningur eiga í raun við þetta netfang. Geyma þarf erindi aðskilin frá persónulegum pósti, takmarka aðgang og nota fjölþáttaauðkenningu. Ekki biðja um bankaskrár, lykilorð eða skilríki í almennum tölvupósti; ákveða skal örugga leið ef nauðsynleg gögn vantar. [Google Workspace Personal-skilmálar](https://workspace.google.com/intl/en_sg/terms/workspace-personal-terms/), [Google-leiðbeiningar um CDPA](https://knowledge.workspace.google.com/admin/compliance/privacy-compliance-and-records-for-google-workspace-and-cloud-identity).

## Skrá yfir vinnslu og rekstur

Þessi grunnskrá lýsir kóðanum. Ábyrgðaraðili þarf að bæta við staðfestum varðveislutímum, viðtakendum, vistunarstöðum og öryggisráðstöfunum. Persónuvernd leiðbeinir um að halda vinnsluskrá vegna reglulegrar vinnslu; smæð rekstrarins er ekki sjálfkrafa undanþága. [Leiðbeiningar Persónuverndar fyrir fyrirtæki og stofnanir](https://www.personuvernd.is/media/leidbeiningar-personuverndar/Fyrirtaeki-og-stofnanir-i-nyju-personuverndarumhverfi.pdf).

| Vinnsla | Gögn og kerfi | Fyrirhugaður grundvöllur og framkvæmd |
| --- | --- | --- |
| Aðgangur og vistun fjármála | Netfang, valið nafn, auðkenning; færslur, flokkar, áætlanir, reikningar, greiðslur og sparnaður. Supabase og Vercel. | Nauðsyn vegna umbeðinnar þjónustu. Gælunafn heimilt; ekki þarf kennitölu eða bankaaðgang. |
| Innflutningur | Skrá lesin í vafra; lesnar færslur sendar til vefþjóns við yfirferð; valdar færslur vistaðar við staðfestingu. | Sama þjónusta. Upprunaleg skrá er ekki vistuð sem skrá. Innflutningsreglur í vafra geta innihaldið lýsingatexta. |
| Öryggi | Auðkenningar- og rekstrarannálar hjá þjónustuveitendum. | Meta og skrá lögmæta hagsmuni, nauðsyn og vægi réttinda notenda. Hreinsa persónugreinanlegt efni úr villuskráningu. |
| Aðstoð og réttindabeiðnir | Erindi í tölvupósti; eyðingarbeiðni í Auth-lýsigögnum. | Aðstoð vegna þjónustu; lagaskylda vegna réttindabeiðna. Aðgreina tilgang og varðveislu. |
| Valfrjáls gröf | TradingView fær tengiupplýsingar vafrans eftir virkjun; færslulisti er ekki sendur með gröfunum. | Sérstakt val sem má afturkalla. Staðfesta í vafraprófi að ekkert TradingView-efni hleðst fyrir samþykki. |

Áður en opnað er skal ákveða fyrir hvaða aldur þjónustan er ætluð og hvort skráningarferlið og heimildirnar styðji það. Útbúa þarf mat á þörf fyrir MÁP og persónuverndarfulltrúa út frá raunverulegu umfangi og áhættu. Ef vinnslan er líkleg til að skapa mikla áhættu þarf MÁP áður en hún hefst; ekki merkja það sjálfkrafa óþarft vegna þess að reksturinn er lítill. [Persónuvernd: mat á áhrifum á persónuvernd](https://www.personuvernd.is/media/leidbeiningar-personuverndar/MAP-Mat-a-Ahrifum-a-Personuvernd.pdf).

### Réttindabeiðnir, eyðing og atvik

1. Bjartur ber ábyrgð á daglegri yfirferð tengiliðspósthólfs og virkra `account_deletion_request` beiðna í Supabase Auth. Engin tilkynning berst sjálfkrafa úr forritinu. Skrá móttöku, reiknaðan frest, aðgerð og niðurstöðu í aðgangsstýrða rekstrarskrá.
2. Staðfesta auðkenni með hóflegum hætti, helst í tengslum við staðfestan aðgang. Ekki senda afrit til annars netfangs bara af því að það er nefnt í beiðni. Óska ekki sjálfkrafa eftir afriti af skilríkjum.
3. Afgreiða aðgang, leiðréttingu, eyðingu, takmörkun, andmæli og flutning eftir því sem við á. Svara án ótilhlýðilegrar tafar, að jafnaði innan eins mánaðar. Heimil framlenging um allt að tvo mánuði þarf rökstuðning og tilkynningu innan fyrsta mánaðar. Sjá 12.–22. gr. [persónuverndarreglugerðarinnar í íslenskum lögum](https://www.althingi.is/lagas/nuna/2018090.html).
4. Eyðing Auth-notanda í réttum gagnagrunni eyðir tengdum virkum forritsgögnum með gagnagrunnstengingum. Nota staðfest notandaauðkenni og yfirfara beiðnina aftur rétt fyrir eyðingu svo ekki sé eytt eftir afturköllun. Prófa ferlið aðeins með tilbúnum aðgangi. Sjá [nánara rekstrarferli](account-data-operations.md); staðfestur tengiliður hér tekur við af eldri óstaðfestri lýsingu þess skjals.
5. Varðveita lágmarksstaðfestingu um afgreiðslu samkvæmt samþykktri reglu; ekki halda eftir fullu fjárhagsafriti. Við endurheimt af afriti skal endurtaka samþykktar eyðingar áður en endurheimt kerfi opnar fyrir notendur.
6. Við öryggisatvik: takmarka tjón, varðveita nauðsynleg sönnunargögn og skrá áhættumat. Tilkynna Persónuvernd án ótilhlýðilegrar tafar og, ef mögulegt er, innan 72 klukkustunda frá vitneskju nema ólíklegt sé að brotið valdi áhættu. Láta viðkomandi einstaklinga vita án ótilhlýðilegrar tafar þegar mikil áhætta er líkleg, með þeim undantekningum sem lög heimila. Sjá 33.–34. gr. [persónuverndarreglugerðarinnar](https://www.althingi.is/lagas/nuna/2018090.html).

## Gagnagrunnsbreyting og staðfesting

Framleiðsluuppsetning 25. september 2026: verkefnið `Finance app` (`gtgqxgddlqcvspegvxzt`) keyrði PostgreSQL 17.6. Lespróf fann engin eigandamisræmi og staðfesti fyrri sparnaðar-RPC og þrjár virkar reikningavarnir. Breytingin lauk í einni færslu án breytinga á fjárhagsgögnum. Eftirfylgnipróf staðfesti alla fjóra samsettu erlendu lyklana, staðfestingu þeirra og réttar eyðingarreglur; PostgREST-skema var endurhlaðið. Fyrri skilgreiningar tengsla voru lesnar fyrir uppsetningu. Stjórnborðið sýndi Free-áskrift og engin afrit; staðfest afritunar- og endurheimtarferli er því enn opið rekstrarverkefni. Raunveruleg tveggja notenda prófun í aðskildu Supabase-prófunarumhverfi bíður enn, þótt staðbundin PostgreSQL-próf hafi staðist.

`supabase/owner-reference-integrity-update.sql` krefst PostgreSQL 15 eða nýrri og kemur á eftir fyrri breytingum vegna reikninga og sparnaðar. Sömu SQL-fyrirmæli eru aftast í grunnskemanum. Fyrri gagnaaðskilnaður með RLS hindraði lestur á flokki annars notanda en einn dálkur í erlendum lykli gat samt leyft tengingu við þekkt auðkenni þess flokks.

Nýir samsettir lyklar para auðkenni foreldris og notanda. Þeir vernda bæði innskráða notendur og forréttindaskrif, þar á meðal samtímis breytingu eiganda. Eyðing flokks varðveitir eiganda færslna/reikninga og tæmir aðeins flokksauðkennið; flokksáætlanir eyðast. Eyðing markmiðs eyðir framlögum þess.

- Taka staðfest afrit og prófa fyrst í aðskildu prófunarumhverfi. Keyra breytinguna í heild í viðhaldstíma; hún tekur tímabundna skriflása og notar tímamörk.
- Ef eldri tengingar milli ólíkra eigenda finnast stöðvast breytingin og engin sjálfvirk leiðrétting eða eyðing fer fram. Skoða slíkt sem mögulegt persónuverndaratvik, ekki aðeins villu í uppsetningu.
- Eftir uppsetningu staðfesta fjóra virka, staðfesta samsetta erlenda lykla, endurhlaða PostgREST-skema og sannreyna venjuleg tengd yfirlit.
- Endurtaka tveggja notenda próf á raunverulegri prófunaruppsetningu. Prófa lestur, breytingar, tengingar, útflutning og eyðingu með tilbúnum gögnum; ekki fjárhagsgögnum raunverulegra notenda.

Þann 24. september 2026 stóðust **11 afmörkuð próf á PostgreSQL 17.10** með `scripts/owner-reference-postgres.cjs`. Þau prófa eldri gloppu, afturköllun við ósamræmi, endurtekna uppsetningu, alla fjóra tengslaflokka, eyðingar, samhliða skrif og nýtt grunnskema. Prófunin notaði aðeins tímabundinn staðbundinn gagnagrunn; niðurstaðan segir ekki að breytingin sé komin í framleiðslu.

Sama dag stóðust einnig **33 eldri samþættingarpróf** í `scripts/bill-payment-postgres.cjs` fyrir reikninga, sparnað, aðgangsstýringu, samtímis skrif og nýtt grunnskema. Samtals stóðust því 44 raunveruleg PostgreSQL-próf; enginn fjarlægur gagnagrunnur var notaður.

## Opnun nýskráningar

Á meðan opnun bíður skal hafa `PUBLIC_REGISTRATION_ENABLED` ósett eða `false`. **Einnig þarf að loka fyrir nýja notendur í Supabase Auth** og staðfesta að bein nýskráning með opinbera lykli verkefnisins sé lokuð. Vefvörnin getur ekki ein og sér lokað beinu Auth-API eða eldri útgáfu vefsins.

Eftir að verkefnum hér að ofan er lokið skal setja staðfestan, mannamálstexta í eftirfarandi stillingar. Textinn birtist á opinberri persónuverndarsíðu og má ekki innihalda lykla eða trúnaðarupplýsingar:

| Stilling | Það sem þarf að lýsa |
| --- | --- |
| `PRIVACY_DATA_LOCATION` | Raunverulegum vistunarstöðum gagnagrunns, keyrslu, afrita og annála. |
| `PRIVACY_TRANSFER_SAFEGUARDS` | Hvaða vinnsla fer út fyrir EES, viðtakendum og gildum verndarráðstöfunum. |
| `PRIVACY_BACKUP_RETENTION` | Raunverulegu tímabili afrita/PITR og áhrifum eyðingar. |
| `PRIVACY_LOG_RETENTION` | Tímabilum eftir tegund rekstrar- og öryggisannála. |
| `PRIVACY_SUPPORT_RETENTION` | Tímabili erinda og lágmarksgagna um afgreiðslu réttindabeiðna. |

Ekki fylla reitina með „í vinnslu“, dæmum eða ágiskunum til að komast fram hjá vörninni. Að reitirnir séu ekki auðir staðfestir aðeins að texti hafi verið settur inn. Bjartur þarf að staðfesta að textinn sé réttur og reksturinn fylgi honum. Síðan má sérstaklega virkja `PUBLIC_REGISTRATION_ENABLED=true`, samræma Supabase-stillinguna og prófa útgefna skráningarleið áður en tilkynnt er um almenna opnun.
