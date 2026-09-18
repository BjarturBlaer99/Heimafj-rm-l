import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { ActionForm } from "@/components/action-form";
import { PasswordChangeForm } from "@/components/password-change-form";
import { SettingsAppearance } from "@/components/settings-appearance";
import { AccountDataControls } from "@/components/account-data-controls";
import { Button, Field, inputClass, PageHeader } from "@/components/ui";
import { deleteCategory, saveCategory, saveProfile, signOut } from "@/lib/actions";
import { getAuthed, getCategories, getProfile } from "@/lib/data";
import { accountDeletionRequestedAt } from "@/lib/account-deletion";
import styles from "./settings.module.css";

const categoryTypeLabels = { income: "Tekjur", expense: "Útgjöld", both: "Tekjur og útgjöld" };

function CategoryTypes() {
  return <><option value="expense">Útgjöld</option><option value="income">Tekjur</option><option value="both">Tekjur og útgjöld</option></>;
}

export default async function SettingsPage() {
  const [profile, categories, { user }] = await Promise.all([getProfile(), getCategories(), getAuthed()]);
  const customCategories = categories.filter((category) => !category.is_default);
  const defaultCategories = categories.filter((category) => category.is_default);
  const fullName = profile?.full_name?.trim() || "Minn aðgangur";
  const requestedAt = accountDeletionRequestedAt(user.user_metadata?.account_deletion_request);
  const initials = profile?.full_name?.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "M";

  return (
    <div className={styles.page}>
      <PageHeader title="Stillingar" description="Aðgangurinn þinn, útlit síðunnar og flokkun færslna." />

      <div className={styles.accountSummary} data-scroll-reveal="">
        <span className={styles.avatar} aria-hidden="true">{initials}</span>
        <div className={styles.identity}><p>{fullName}</p>{user.email ? <span>{user.email}</span> : null}</div>
        <span className={styles.accountLabel}>Persónulegur aðgangur</span>
      </div>

      <nav className={styles.sectionNav} aria-label="Hlutar stillinga" data-scroll-reveal="">
        <a href="#profile-settings">Upplýsingar</a><a href="#appearance-settings">Útlit</a><a href="#category-settings">Flokkar</a><a href="#account-settings">Aðgangur</a><a href="#data-settings">Gögn og aðstoð</a>
      </nav>

      <section id="profile-settings" className={styles.settingsSection} aria-labelledby="profile-heading" data-scroll-reveal="">
        <div className={styles.sectionIntro}><span className={styles.sectionNumber}>01</span><h2 id="profile-heading">Þínar upplýsingar</h2><p>Nafnið sem birtist á yfirlitinu og gjaldmiðill aðgangsins.</p></div>
        <div className={styles.panel}>
          <ActionForm action={saveProfile} className={styles.profileForm}>
            <Field label="Fullt nafn"><input className={inputClass} name="full_name" autoComplete="name" maxLength={80} defaultValue={profile?.full_name ?? ""} required /></Field>
            <Field label="Gjaldmiðill"><input className={`${inputClass} ${styles.currencyInput}`} name="currency" aria-describedby="currency-help" value="ISK" readOnly /><span id="currency-help" className={styles.fieldHelp}>Allar skráðar upphæðir eru í íslenskum krónum. Engin gjaldeyrisumbreyting.</span></Field>
            <div className={styles.formFooter}><Button type="submit">Vista upplýsingar</Button></div>
          </ActionForm>
        </div>
      </section>

      <section id="appearance-settings" className={styles.settingsSection} aria-labelledby="appearance-heading" data-scroll-reveal="">
        <div className={styles.sectionIntro}><span className={styles.sectionNumber}>02</span><h2 id="appearance-heading">Útlit</h2><p>Veldu ljóst eða dökkt þema fyrir síðuna á þessu tæki.</p></div>
        <div className={styles.panel}><SettingsAppearance /></div>
      </section>

      <section id="category-settings" className={styles.settingsSection} aria-labelledby="categories-heading">
        <div className={styles.sectionIntro} data-scroll-reveal=""><span className={styles.sectionNumber}>03</span><h2 id="categories-heading">Flokkar færslna</h2><p>Hafðu flokkun tekna og útgjalda í takt við þín fjármál.</p></div>
        <div className={styles.categoryColumn}>
          <div className={styles.panel} data-scroll-reveal="">
            <div className={styles.panelHeading}><h3>Nýr flokkur</h3><p>Bættu við flokki sem þú getur notað við skráningu færslna.</p></div>
            <ActionForm resetOnSuccess action={saveCategory} className={styles.categoryForm}>
              <Field label="Heiti flokks"><input className={inputClass} name="name" placeholder="T.d. Ferðalög" minLength={2} maxLength={60} required /></Field>
              <Field label="Tegund"><select className={inputClass} name="type"><CategoryTypes /></select></Field>
              <div className={styles.categoryActions}><Button type="submit"><PlusIcon size={16} aria-hidden="true" />Bæta við flokki</Button></div>
            </ActionForm>
          </div>

          <div className={styles.categoryList}>
            <div className={styles.listHeading} data-scroll-reveal=""><h3>Þínir flokkar</h3><span>{customCategories.length}</span></div>
            {customCategories.length ? customCategories.map((category) => (
              <article key={category.id} className={styles.customCategory} aria-labelledby={`category-${category.id}`} data-scroll-reveal="">
                <div className={styles.categoryHeading}><h4 id={`category-${category.id}`}>{category.name}</h4><span className={styles.typeLabel}>{categoryTypeLabels[category.type]}</span></div>
                <ActionForm action={saveCategory} className={styles.categoryForm}>
                  <input type="hidden" name="id" value={category.id} />
                  <Field label="Heiti flokks"><input className={inputClass} name="name" defaultValue={category.name} minLength={2} maxLength={60} required /></Field>
                  <Field label="Tegund"><select className={inputClass} name="type" defaultValue={category.type}><CategoryTypes /></select></Field>
                  <div className={styles.categoryActions}><Button type="submit" variant="secondary">Vista breytingar</Button></div>
                </ActionForm>
                <ActionForm action={deleteCategory} className={styles.deleteCategory}>
                  <input type="hidden" name="id" value={category.id} />
                  <Button type="submit" variant="secondary" className={styles.deleteButton} aria-label={`Eyða flokknum ${category.name}`}><TrashIcon size={15} aria-hidden="true" />Eyða flokki</Button>
                </ActionForm>
              </article>
            )) : <div className={styles.emptyCategories} data-scroll-reveal=""><p>Þú hefur ekki bætt við eigin flokkum.</p><span>Notaðu sjálfgefnu flokkana eða búðu til nýjan hér fyrir ofan.</span></div>}
          </div>

          {defaultCategories.length ? <div className={styles.defaultCategories}>
            <div className={styles.defaultHeading} data-scroll-reveal=""><div><h3>Sjálfgefnir flokkar</h3><p>Þessir flokkar fylgja aðganginum og ekki er hægt að breyta þeim.</p></div><span>{defaultCategories.length}</span></div>
            <ul>{defaultCategories.map((category) => <li key={category.id} data-scroll-reveal=""><span>{category.name}</span><span className={styles.typeLabel}>{categoryTypeLabels[category.type]}</span></li>)}</ul>
          </div> : null}
        </div>
      </section>

      <section id="account-settings" className={styles.settingsSection} aria-labelledby="account-heading" data-scroll-reveal="">
        <div className={styles.sectionIntro}><span className={styles.sectionNumber}>04</span><h2 id="account-heading">Aðgangur og öryggi</h2><p>Uppfærðu lykilorðið þitt eða skráðu þig út á þessu tæki.</p></div>
        <div className={styles.panel}>
          <div className={styles.panelHeading}><h3>Breyta lykilorði</h3><p>Staðfestu núverandi lykilorð áður en þú velur nýtt.</p></div>
          <div className={styles.passwordFields}><PasswordChangeForm /></div>
          <div className={styles.signOut}><div><h3>Skrá út</h3><p>Ljúktu innskráningu á þessu tæki.</p></div><form action={signOut}><Button type="submit" variant="secondary"><SignOutIcon size={17} aria-hidden="true" />Skrá út</Button></form></div>
        </div>
      </section>
      <section id="data-settings" className={styles.settingsSection} aria-labelledby="data-heading" data-scroll-reveal="">
        <div className={styles.sectionIntro}><span className={styles.sectionNumber}>05</span><h2 id="data-heading">Gögn og aðstoð</h2><p>Sæktu afrit, finndu leiðbeiningar og stjórnaðu aðganginum þínum.</p></div>
        <div className={styles.panel}><AccountDataControls requestedAt={requestedAt} supportEmail={process.env.SUPPORT_EMAIL} /></div>
      </section>
    </div>
  );
}
