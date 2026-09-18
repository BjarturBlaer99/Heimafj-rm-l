"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Button, DateInput, Field, inputClass } from "@/components/ui";
import { deleteTransaction, saveTransaction } from "@/lib/actions";
import { categorizeTransactions } from "@/lib/transaction-actions";
import type { Transaction, Category } from "@/lib/types";
import styles from "@/app/(app)/transactions/transactions.module.css";

export function TransactionLedger({ transactions, categories }: { transactions: Transaction[]; categories: Category[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const selectedIds = selected.filter((id) => transactions.some((row) => row.id === id));
  const allSelected = transactions.length > 0 && selectedIds.length === transactions.length;
  return <div className={styles.entries}>
    <div className={styles.bulkBar} data-scroll-reveal="">
      <label className={styles.selectAll}><input type="checkbox" checked={allSelected} onChange={(event) => setSelected(event.target.checked ? transactions.map((row) => row.id) : [])} />Velja allar ({transactions.length})</label>
      <ActionForm action={async (form) => { const result = await categorizeTransactions(form); if (!result.error) setSelected([]); return result; }} className={styles.bulkForm}>
        {selectedIds.map((id) => <input key={id} type="hidden" name="transaction_ids" value={id} />)}
        <Field label="Flokka valdar færslur"><select className={inputClass} name="category_id" defaultValue=""><option value="">Óflokkað</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
        <Button type="submit" variant="secondary" disabled={!selectedIds.length}>Vista flokkun ({selectedIds.length})</Button>
      </ActionForm>
    </div>
    {transactions.map((transaction) => <article id={`transaction-${transaction.id}`} key={`${transaction.id}-${transaction.updated_at}`} className={styles.compactEntry} aria-label={transaction.note || "Færsla"} data-scroll-reveal="">
      <label className={styles.recordSelect}><input type="checkbox" aria-label={`Velja færslu: ${transaction.note || transaction.date}`} checked={selectedIds.includes(transaction.id)} onChange={(event) => setSelected((ids) => event.target.checked ? [...ids, transaction.id] : ids.filter((id) => id !== transaction.id))} /><span>{transaction.type === "income" ? "Tekjur" : "Útgjöld"}</span></label>
      <ActionForm action={saveTransaction} className={styles.compactForm}>
        <input type="hidden" name="id" value={transaction.id} />
        <Field label="Lýsing"><input className={inputClass} name="note" maxLength={500} defaultValue={transaction.note ?? ""} /></Field>
        <Field label="Upphæð · ISK"><input className={inputClass} name="amount" type="number" step="0.01" min="0.01" defaultValue={Number(transaction.amount)} required /></Field>
        <Field label="Dagsetning"><DateInput name="date" type="date" defaultValue={transaction.date} required /></Field>
        <Field label="Tegund"><select className={inputClass} name="type" defaultValue={transaction.type}><option value="expense">Útgjöld</option><option value="income">Tekjur</option></select></Field>
        <Field label="Flokkur"><select className={inputClass} name="category_id" defaultValue={transaction.category_id ?? ""}><option value="">Óflokkað</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
        <Button type="submit" variant="secondary">Vista</Button>
      </ActionForm>
      <div className={styles.recordActions}>
        {transaction.category_id ? <Link href={`/transactions/category/${transaction.category_id}?month=${transaction.date.slice(0, 7)}&type=${transaction.type}`}>Færslur í flokknum</Link> : <span>Óflokkað</span>}
        <ActionForm action={deleteTransaction}><input type="hidden" name="id" value={transaction.id} /><ConfirmButton type="submit" variant="secondary" className={styles.deleteButton} confirmMessage="Eyða þessari færslu? Ekki er hægt að afturkalla eyðinguna.">Eyða færslu</ConfirmButton></ActionForm>
      </div>
    </article>)}
    <div className={styles.ledgerFooter}><span>{transactions.length} færslur</span><span>Upphæðir í íslenskum krónum</span></div>
  </div>;
}
