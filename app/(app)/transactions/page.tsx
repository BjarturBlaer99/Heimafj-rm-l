import { ActionForm } from "@/components/action-form";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon as Trash2 } from "@phosphor-icons/react/dist/ssr/Trash";
import { FileArrowUpIcon } from "@phosphor-icons/react/dist/ssr/FileArrowUp";

import Link from "next/link";
import { ConfirmButton } from "@/components/confirm-button";
import { CsvImporter } from "@/components/csv-importer";
import { FlashMessage } from "@/components/flash-message";
import { Button, DateInput, EmptyState, Field, PageHeader, inputClass } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { deleteAllTransactions, saveTransaction } from "@/lib/actions";
import { getAuthed, getCategories, getTransactions } from "@/lib/data";
import { currentMonth, isoDate, money } from "@/lib/format";
import { resolveTransactionPeriod, transactionPeriodQuery } from "@/lib/transaction-period";
import { TransactionPeriodFields } from "@/components/transaction-period-fields";
import { TransactionLedger } from "@/components/transaction-ledger";
import styles from "./transactions.module.css";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const period = resolveTransactionPeriod(params, currentMonth());
  const [categories, transactions, { user }] = await Promise.all([
    getCategories(),
    getTransactions({ ...period, type: params.type, category: params.category, search: params.search, id: params.id }), getAuthed()
  ]);
  const currency = "ISK";
  const selectableCategories = categories.filter((category) => params.type === "income" ? category.type !== "expense" : params.type === "expense" ? category.type !== "income" : true);
  const income = transactions.reduce((sum, tx) => sum + (tx.type === "income" ? Number(tx.amount) : 0), 0);
  const expenses = transactions.reduce((sum, tx) => sum + (tx.type === "expense" ? Number(tx.amount) : 0), 0);
  const hasFilters = Boolean(params.type || params.category || params.search || params.id);

  return (
    <div className={styles.page}>
      <PageHeader title="Færslur" description="Allar hreyfingar á einum stað. Finndu færslu, breyttu flokkun eða bættu við nýrri."
        action={<div className={styles.headerActions}><a href="#import-transactions" className={buttonVariants({ variant: "secondary" })}><FileArrowUpIcon size={17} aria-hidden="true" />Flytja inn skrá</a><a href="#new-transaction" className={buttonVariants()}><Plus size={17} aria-hidden="true" />Ný færsla</a></div>} />
      <FlashMessage code={params.success} imported={params.imported} skipped={params.skipped} />

      <dl className={styles.summary} aria-label="Samantekt fyrir valdar síur" data-scroll-reveal>
        <div><dt>Tekjur</dt><dd>{money(income, currency)}</dd><p>{period.label}</p></div>
        <div><dt>Útgjöld</dt><dd>{money(expenses, currency)}</dd><p>{period.label}</p></div>
        <div className={styles.netSummary}><dt>Mismunur</dt><dd data-negative={income - expenses < 0}>{money(income - expenses, currency)}</dd><p>Tekjur að frádregnum útgjöldum</p></div>
      </dl>

      <section className={styles.ledger} aria-labelledby="transactions-heading">
        <div className={styles.sectionHeading} data-scroll-reveal><div><h2 id="transactions-heading">Skráðar færslur</h2><p>{transactions.length} færslur fyrir valdar síur</p></div></div>
        <section className={styles.filterPanel} aria-labelledby="transaction-filters-heading" data-scroll-reveal>
          <div className={styles.filterHeading}><h3 id="transaction-filters-heading">Leita og sía</h3><p>{period.label} · {transactions.length} færslur</p></div>
          <form className={styles.filters}>
            <TransactionPeriodFields key={`${period.period}-${period.month}-${period.from}-${period.to}`} period={period.period} month={period.month ?? currentMonth()} from={period.from} to={period.to} />
            <div className={styles.searchFields}>
              <Field label="Leit"><input className={inputClass} name="search" defaultValue={params.search} placeholder="Leita eftir lýsingu" /></Field>
              <Field label="Tegund"><select className={inputClass} name="type" defaultValue={params.type ?? ""}><option value="">Allar færslur</option><option value="income">Tekjur</option><option value="expense">Útgjöld</option></select></Field>
              <Field label="Flokkur"><select className={inputClass} name="category" defaultValue={params.category ?? ""}><option value="">Allir flokkar</option>{selectableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
            </div>
            <div className={styles.filterActions}>{hasFilters ? <Link href={`/transactions?${transactionPeriodQuery(period)}`} className={styles.clearFilters}>Hreinsa síur</Link> : null}<Button type="submit" variant="secondary">Sía færslur</Button></div>
          </form>
        </section>
        {params.id ? <p className="px-6 py-3 text-sm text-ink/60">Valin færsla · <Link className="text-accent" href={`/transactions?${transactionPeriodQuery(period)}`}>Sjá allt tímabilið</Link></p> : null}
        {transactions.length ? <TransactionLedger transactions={transactions} categories={categories} /> : <div className={styles.empty} data-scroll-reveal><EmptyState>Engar færslur fundust fyrir þessar síur. Prófaðu annað tímabil eða bættu við fyrstu færslunni.</EmptyState></div>}
      </section>

      <section id="new-transaction" className={styles.newEntry} aria-labelledby="new-transaction-heading" data-scroll-reveal>
        <div className={styles.sectionHeading}><div><h2 id="new-transaction-heading">Ný færsla</h2><p>Skráðu tekjur eða útgjöld handvirkt.</p></div><Plus size={19} aria-hidden="true" /></div>
        <ActionForm resetOnSuccess action={saveTransaction} className={styles.newEntryForm}>
          <Field label="Lýsing"><input className={inputClass} name="note" placeholder="T.d. matarinnkaup" required /></Field>
          <Field label="Upphæð"><input className={inputClass} name="amount" type="number" step="0.01" min="0.01" placeholder="0 kr." required /></Field>
          <Field label="Tegund"><select className={inputClass} name="type" required><option value="expense">Útgjöld</option><option value="income">Tekjur</option></select></Field>
          <Field label="Dagsetning"><DateInput name="date" type="date" defaultValue={isoDate()} required /></Field>
          <Field label="Flokkur"><select className={inputClass} name="category_id"><option value="">Óflokkað</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
          <Button type="submit"><Plus size={17} aria-hidden="true" />Bæta við færslu</Button>
        </ActionForm>
      </section>

      <CsvImporter categories={categories} userId={user.id} />

      {transactions.length ? <section className={styles.management} aria-labelledby="transaction-management-heading" data-scroll-reveal><h2 id="transaction-management-heading">Umsjón færslna</h2><div><p>Þessi aðgerð eyðir öllum skráðum færslum, líka þeim sem birtast ekki í völdum síum.</p><ActionForm action={deleteAllTransactions}><ConfirmButton variant="danger" confirmMessage="Ertu viss um að þú viljir eyða öllum færslum? Þetta er ekki hægt að afturkalla."><Trash2 size={16} aria-hidden="true" />Eyða öllum færslum</ConfirmButton></ActionForm></div></section> : null}
    </div>
  );
}
