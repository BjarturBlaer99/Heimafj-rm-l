"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { FileArrowUpIcon } from "@phosphor-icons/react/dist/csr/FileArrowUp";
import { SpinnerGapIcon } from "@phosphor-icons/react/dist/csr/SpinnerGap";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, EmptyState, Field, inputClass } from "@/components/ui";
import { checkImportDuplicates, saveReviewedImport } from "@/lib/import-actions";
import { detectHeader, parseCsv, readCsvText, readXlsxRows } from "@/lib/import-parser";
import { buildImportReview, excludedReasonLabels, findImportDuplicates, IMPORT_PAGE_SIZE, importReviewKey, mappingKey, parseImportPreferences, type ImportColumns, type ImportDecision, type ImportPreferences, type ImportRow, type ReviewedImportRow } from "@/lib/import-review";
import { money } from "@/lib/format";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const emptyPreferences: ImportPreferences = { version: 1, mappings: {}, rules: [] };
const duplicateLabels = { existing: "Færsla með sömu dagsetningu, upphæð og lýsingu er þegar skráð.", file: "Færsla með sömu dagsetningu, upphæð og lýsingu er fyrr í skránni.", both: "Sama færsla virðist þegar vera skráð og kemur líka fyrr í skránni." };
const number = (value: number) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const displayDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").reverse().join(".") : value;
type Completion = Extract<Awaited<ReturnType<typeof saveReviewedImport>>, { status: "complete" }>;

function Pagination({ page, count, onChange, label, disabled }: { page: number; count: number; onChange: (page: number) => void; label: string; disabled: boolean }) {
  const pages = Math.max(1, Math.ceil(count / IMPORT_PAGE_SIZE));
  return <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3 border-t border-line/10 p-4">
    <p role="status" className="text-xs text-ink/65">{count ? page * IMPORT_PAGE_SIZE + 1 : 0}–{Math.min((page + 1) * IMPORT_PAGE_SIZE, count)} af {number(count)}</p>
    <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="secondary" disabled={disabled || page === 0} onClick={() => onChange(page - 1)}>Fyrri</Button>
      <label className="flex items-center gap-2 text-xs"><span className="sr-only">Velja síðu: {label}</span><select className={cn(inputClass, "w-auto min-w-24")} value={page} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))}>{Array.from({ length: pages }, (_, index) => <option key={index} value={index}>Síða {index + 1} / {pages}</option>)}</select></label>
      <Button type="button" variant="secondary" disabled={disabled || page >= pages - 1} onClick={() => onChange(page + 1)}>Næsta</Button></div>
  </nav>;
}

export function CsvImporter({ categories, userId }: { categories: Category[]; userId: string }) {
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [draftText, setDraftText] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [completed, setCompleted] = useState<Completion | null>(null);
  const [columns, setColumns] = useState<Partial<ImportColumns>>({});
  const [categoryId, setCategoryId] = useState("");
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [decisions, setDecisions] = useState<Record<number, ImportDecision>>({});
  const [confirmations, setConfirmations] = useState<Record<number, string>>({});
  const [existingKeys, setExistingKeys] = useState<string[]>([]);
  const [checkedSignature, setCheckedSignature] = useState("");
  const [duplicateError, setDuplicateError] = useState("");
  const [duplicateAttempt, setDuplicateAttempt] = useState(0);
  const [reviewPage, setReviewPage] = useState(0);
  const [excludedPage, setExcludedPage] = useState(0);
  const [preferences, setPreferences] = useState<ImportPreferences>(emptyPreferences);
  const [preferenceMessage, setPreferenceMessage] = useState("");
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCategory, setRuleCategory] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const pasteInput = useRef<HTMLTextAreaElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const excludedHeading = useRef<HTMLHeadingElement>(null);
  const completionHeading = useRef<HTMLHeadingElement>(null);
  const readSequence = useRef(0);
  const importing = useRef(false);
  const batchId = useRef("");
  const submission = useRef<{ batchId: string; userId: string; rows: ReviewedImportRow[] } | null>(null);
  const storageKey = `min-fjarmal:import-preferences:v1:${userId}`;
  const parsed = useMemo(() => parseCsv(csvText), [csvText]);
  const headers = parsed.headers;
  const selected: ImportColumns = {
    date: columns.date ?? detectHeader(headers, ["dagsetning", "date", "bokunardagur", "valuedate"]),
    note: columns.note ?? detectHeader(headers, ["motadili", "motaili", "lysing", "description", "texti", "skyring", "note", "merchant"]),
    merchantType: columns.merchantType ?? detectHeader(headers, ["tegund", "type", "flokkur", "mcc", "merchantcategory"]),
    amount: columns.amount ?? detectHeader(headers, ["upphaed", "amount", "amountisk", "fjhar", "hreyfing", "upph"], ["erlendumgjaldmidli", "foreigncurrency", "foreignamount", "currencyamount"]),
    debit: columns.debit ?? detectHeader(headers, ["debet", "debit", "utborgun", "withdrawal"]),
    credit: columns.credit ?? detectHeader(headers, ["kredit", "credit", "innborgun", "deposit", "greidsla", "payment"])
  };
  const selectedKey = JSON.stringify(selected);
  const review = useMemo(() => buildImportReview(parsed.rows, JSON.parse(selectedKey), categories, preferences.rules, categoryId), [parsed.rows, selectedKey, categories, preferences.rules, categoryId]);
  const rows = review.rows.map((row) => ({ ...row, category_id: overrides[row.sourceIndex] !== undefined ? overrides[row.sourceIndex] || null : row.category_id }));
  const candidateSignature = JSON.stringify(review.rows.map((row) => ({ ...row, category_id: null })));
  const duplicates = findImportDuplicates(rows, existingKeys);
  const decisionFor = (row: ImportRow): ImportDecision => duplicates[row.sourceIndex] ? ["skip", "import_duplicate"].includes(decisions[row.sourceIndex]) ? decisions[row.sourceIndex] : "undecided" : decisions[row.sourceIndex] === "skip" ? "skip" : "import";
  const isReviewed = (row: ImportRow) => confirmations[row.sourceIndex] === importReviewKey(row, decisionFor(row));
  const included = rows.filter((row) => ["import", "import_duplicate"].includes(decisionFor(row)));
  const unresolved = rows.filter((row) => decisionFor(row) === "undecided" || decisionFor(row) !== "skip" && !isReviewed(row));
  const total = included.reduce((sum, row) => sum + row.amount, 0);
  const skipped = rows.filter((row) => decisionFor(row) === "skip");
  const actualPage = Math.min(reviewPage, Math.max(0, Math.ceil(rows.length / IMPORT_PAGE_SIZE) - 1));
  const pageRows = rows.slice(actualPage * IMPORT_PAGE_SIZE, (actualPage + 1) * IMPORT_PAGE_SIZE);
  const actualExcludedPage = Math.min(excludedPage, Math.max(0, Math.ceil(review.excluded.length / IMPORT_PAGE_SIZE) - 1));
  const excludedRows = review.excluded.slice(actualExcludedPage * IMPORT_PAGE_SIZE, (actualExcludedPage + 1) * IMPORT_PAGE_SIZE);
  const busy = isReading || isImporting;
  const locked = busy || submission.current !== null && !completed;
  const duplicateReady = checkedSignature === candidateSignature && !duplicateError;
  const hasReview = Boolean(csvText) && !isReading && !completed;
  const expenseCategories = categories.filter((category) => category.type !== "income");
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const columnFields: Array<{ label: string; key: keyof ImportColumns }> = [{ label: "Dagsetning", key: "date" }, { label: "Mótaðili eða lýsing", key: "note" }, { label: "Upphæð", key: "amount" }, { label: "Tegund færslu í skránni", key: "merchantType" }, { label: "Debetdálkur", key: "debit" }, { label: "Kreditdálkur", key: "credit" }];

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try { setPreferences(parseImportPreferences(localStorage.getItem(storageKey))); } catch { setPreferences(emptyPreferences); }
    });
    return () => { cancelled = true; };
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      await Promise.resolve();
      if (cancelled) return;
      setDuplicateError("");
      if (!csvText) return;
      try {
        const result = await checkImportDuplicates(JSON.parse(candidateSignature));
        if (cancelled) return;
        if (result.userId !== userId) throw new Error("Þú hefur skipt um aðgang. Endurhlaðaðu síðuna.");
        setExistingKeys(result.existingKeys);
        setCheckedSignature(candidateSignature);
      } catch { if (!cancelled) setDuplicateError("Ekki tókst að athuga hvort færslurnar séu þegar skráðar. Reyndu aftur áður en þú flytur þær inn."); }
    }
    void check();
    return () => { cancelled = true; };
  }, [candidateSignature, csvText, duplicateAttempt, userId]);

  function persistPreferences(next: ImportPreferences) {
    const cleaned = parseImportPreferences(JSON.stringify(next));
    setPreferences(cleaned);
    try { localStorage.setItem(storageKey, JSON.stringify(cleaned)); setPreferenceMessage("Stillingarnar hafa verið vistaðar í þessum vafra."); }
    catch { setPreferenceMessage("Stillingarnar gilda núna, en vafrinn gat ekki vistað þær fyrir næsta skipti."); }
  }

  function forgetPreferences() {
    try {
      localStorage.removeItem(storageKey);
      setPreferences(emptyPreferences);
      setPreferenceMessage("Dálkastillingum og flokkunarreglum hefur verið eytt úr þessum vafra.");
    } catch { setPreferenceMessage("Ekki tókst að eyða vistuðum stillingum. Reyndu aftur."); }
  }

  function resetSource() {
    readSequence.current += 1;
    batchId.current = crypto.randomUUID();
    submission.current = null;
    setCsvText(""); setDraftText(""); setFileName(""); setFileError(""); setImportError(""); setCompleted(null);
    setIsReading(false); setIsDragging(false); setColumns({}); setCategoryId(""); setOverrides({}); setDecisions({}); setConfirmations({});
    setExistingKeys([]); setCheckedSignature(""); setDuplicateError(""); setReviewPage(0); setExcludedPage(0); setPreferenceMessage("");
    if (fileInput.current) fileInput.current.value = "";
  }

  function finishReading(text: string, name: string) {
    const source = parseCsv(text);
    if (!text.trim() || source.rows.length === 0) throw new Error("Engar færslur fundust. Skráin þarf að hafa dálkaheiti í fyrstu línu og færslur þar fyrir neðan.");
    const mapping = preferences.mappings[mappingKey(source.headers)];
    if (mapping) { setColumns(mapping); setPreferenceMessage("Vistaðar dálkastillingar passa við þessa skrá. Yfirfarðu þær hér fyrir neðan."); }
    setCsvText(text); setFileName(name); setPasteMode(false);
    requestAnimationFrame(() => reviewHeading.current?.focus({ preventScroll: true }));
  }

  async function loadFile(file: File | null) {
    if (!file || importing.current) return;
    resetSource();
    const sequence = readSequence.current;
    setIsReading(true); setPasteMode(false); setFileName(file.name);
    try {
      if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error("Veldu CSV- eða Excel-skrá.");
      const text = /\.xlsx?$/i.test(file.name) ? (await readXlsxRows(file)).map((row) => row.map((cell) => '"' + String(cell).replaceAll('"', '""') + '"').join(";")).join("\n") : await readCsvText(file);
      if (sequence === readSequence.current) finishReading(text, file.name);
    } catch (error) { if (sequence === readSequence.current) setFileError(/\.xlsx?$/i.test(file.name) ? "Ekki tókst að lesa Excel-skrána. Vistaðu hana sem CSV- eða nýja XLSX-skrá og reyndu aftur." : error instanceof Error ? error.message : "Ekki tókst að lesa skrána."); }
    finally { if (sequence === readSequence.current) setIsReading(false); }
  }

  function previewText() {
    if (importing.current) return;
    const text = draftText;
    resetSource(); setDraftText(text); setPasteMode(true);
    try { finishReading(text, "Innlímdur CSV-texti"); } catch (error) { setFileError(error instanceof Error ? error.message : "Ekki tókst að lesa textann."); }
  }

  function goToPage(page: number, excluded = false) {
    if (excluded) setExcludedPage(page); else setReviewPage(page);
    requestAnimationFrame(() => {
      const heading = excluded ? excludedHeading.current : reviewHeading.current;
      heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: "start" });
    });
  }

  async function submitImport() {
    if (importing.current || !duplicateReady || unresolved.length || !rows.length) return;
    if (!submission.current) submission.current = { batchId: batchId.current, userId, rows: rows.map((row) => ({ ...row, decision: decisionFor(row) as ReviewedImportRow["decision"], reviewed: isReviewed(row) })) };
    importing.current = true; setIsImporting(true); setImportError("");
    try {
      const result = await saveReviewedImport(submission.current);
      if (result.status === "conflict") {
        setImportError(result.message);
        return;
      }
      if (result.status === "needs_review") {
        submission.current = null; setExistingKeys(result.existingKeys);
        setImportError("Fleiri færslur gætu þegar verið skráðar. Veldu hvort á að flytja þær inn eða sleppa þeim og staðfestu aftur.");
        return;
      }
      setCompleted(result); router.refresh();
      requestAnimationFrame(() => completionHeading.current?.focus());
    } catch { setImportError("Ekki tókst að staðfesta hvort færslurnar voru vistaðar. Reyndu aftur með sama takka; þær verða ekki vistaðar tvisvar. Þú getur breytt yfirferðinni þegar innflutningi lýkur eða þú velur nýja skrá."); }
    finally { importing.current = false; setIsImporting(false); }
  }

  return <Card id="import-transactions" aria-label="Innflutningur færslna" className="scroll-mt-24 overflow-hidden p-0 sm:p-0">
    <header className="border-b border-line/10 px-4 py-5 sm:px-6"><div className="flex items-start gap-3"><FileArrowUpIcon size={24} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" /><div><h2 className="text-base font-semibold">Flytja inn færslur</h2><p className="mt-1 text-sm leading-relaxed text-ink/65">Flyttu inn útgjöld úr CSV- eða Excel-skrá frá bankanum þínum. Innborganir og færslur með núllupphæð fara á sérstakan lista og verða ekki fluttar inn.</p><p className="mt-2 text-xs leading-relaxed text-ink/60">Þú getur flutt inn allt að 1.000 útgjaldafærslur í einu. Yfirfarðu allar síður og veldu hvort sleppa eigi færslum sem gætu þegar verið skráðar.</p></div></div></header>
    <p className="border-b border-line/10 px-4 py-4 text-xs leading-relaxed text-ink/65 sm:px-6">Skráin er lesin í vafranum. Dagsetningar, upphæðir og lýsingar mögulegra útgjaldafærslna eru sendar til þjónsins meðan þú yfirfer þær, til að athuga hvort þær séu þegar skráðar. Færslurnar vistast í aðganginum þínum þegar þú staðfestir innflutninginn.</p>
    <input ref={fileInput} type="file" hidden aria-label="Velja bankaskrá" accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={(event) => void loadFile(event.target.files?.[0] ?? null)} />
    <div className="p-4 sm:p-6">
      {fileError ? <p role="alert" className="mb-4 rounded-lg border border-coral/20 bg-coral/5 p-3 text-sm text-coral">{fileError}</p> : null}
      {completed ? <section aria-labelledby="import-complete-heading" className="space-y-5"><div className="flex items-center gap-2"><CheckCircleIcon size={23} className="text-moss" aria-hidden="true" /><h3 id="import-complete-heading" ref={completionHeading} tabIndex={-1} className="text-lg font-semibold focus:outline-none">Innflutningi lokið</h3></div><dl className="grid gap-3 sm:grid-cols-3"><div><dt className="text-xs text-ink/60">Vistaðar færslur</dt><dd className="mt-1 text-2xl font-semibold">{number(completed.imported)}</dd></div><div><dt className="text-xs text-ink/60">Sleppt</dt><dd className="mt-1 text-2xl font-semibold">{number(completed.skipped)}</dd></div><div><dt className="text-xs text-ink/60">Ekki hægt að flytja inn</dt><dd className="mt-1 text-2xl font-semibold">{number(review.excluded.length)}</dd></div></dl><p className="text-sm leading-relaxed text-ink/65">Mögulegum tvítekningum sleppt: {number(completed.duplicatesSkipped)}. Flutt inn þrátt fyrir mögulega tvítekningu: {number(completed.duplicatesImported)}. Ekki flutt inn alls: {number(completed.skipped + review.excluded.length)}.</p><p className="text-xs text-ink/60">Þú finnur innfluttar færslur í færsluyfirlitinu og getur breytt flokkun þeirra þar.</p><div className="flex flex-wrap items-center gap-4"><Link className="inline-flex min-h-11 items-center gap-2 font-semibold text-accent" href={`/transactions?month=&from=${completed.from}&to=${completed.to}`}>Skoða færslur tímabilsins<ArrowRightIcon size={16} aria-hidden="true" /></Link><Button type="button" variant="secondary" onClick={resetSource}>Flytja inn aðra skrá</Button></div></section> : !hasReview ? <>
        {pasteMode ? <div className="space-y-4"><Field label="CSV-texti"><textarea ref={pasteInput} className={cn(inputClass, "h-44 py-3 font-mono text-xs")} placeholder={"Dagsetning;Lýsing;Upphæð\n2026-04-01;Lýsing færslu;-1000"} value={draftText} onChange={(event) => setDraftText(event.target.value)} spellCheck={false} /></Field><div className="flex flex-wrap justify-between gap-3"><Button type="button" variant="secondary" onClick={() => setPasteMode(false)}>Velja skrá í staðinn</Button><Button type="button" disabled={!draftText.trim()} onClick={previewText}>Forskoða færslur<ArrowRightIcon size={16} aria-hidden="true" /></Button></div></div> : <div role="group" aria-label="Skráarval" onDragOver={(event) => { event.preventDefault(); if (!busy) setIsDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false); }} onDrop={(event) => { event.preventDefault(); setIsDragging(false); if (busy) return; if (event.dataTransfer.files.length > 1) { setFileError("Veldu eina bankaskrá í einu."); return; } void loadFile(event.dataTransfer.files[0] ?? null); }} className={cn("rounded-xl border border-dashed px-4 py-9 text-center", isDragging ? "border-accent bg-accent/10" : "border-line/20 bg-muted/20")}><p role="status" className="break-words text-base font-semibold">{isReading ? "Les skrána…" : isDragging ? "Slepptu skránni hér" : "Dragðu bankaskrá hingað"}</p><p className="mt-2 break-words text-sm text-ink/60">{isReading ? fileName : "Eða veldu skrá úr tækinu þínu."}</p><Button type="button" variant="secondary" className="mt-5" disabled={isReading} onClick={() => fileInput.current?.click()}>{isReading ? <SpinnerGapIcon size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}Velja skrá</Button></div>}
        {!pasteMode ? <button type="button" className="focus-ring mt-4 min-h-11 rounded text-sm font-semibold text-accent" disabled={isReading} onClick={() => { setPasteMode(true); requestAnimationFrame(() => pasteInput.current?.focus()); }}>Líma CSV-texta</button> : null}
      </> : <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/10 pb-4"><div className="min-w-0"><p className="break-words text-sm font-semibold">{fileName}</p><p className="mt-1 text-xs text-ink/60">Færslur í skránni: {number(parsed.rows.length)}</p></div><Button type="button" variant="secondary" disabled={busy} onClick={resetSource}>Velja nýja skrá</Button></div>
        <section aria-labelledby="import-columns-heading"><h3 id="import-columns-heading" className="text-sm font-semibold">Dálkar og sjálfvirk flokkun</h3><p className="mt-1 text-xs leading-relaxed text-ink/60">Veldu dálkinn með upphæðinni. Neikvæðar tölur teljast útgjöld. Ef skráin hefur aðskilda debet- og kreditdálka skaltu velja þá í staðinn; kredit er þá dregið frá debet.</p><fieldset disabled={locked} className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><legend className="sr-only">Dálkastillingar</legend>{columnFields.map(({ label, key }) => <Field key={key} label={label}><select className={inputClass} value={selected[key]} onChange={(event) => setColumns((previous) => ({ ...previous, [key]: event.target.value }))}><option value="">Enginn dálkur</option>{headers.map((header, index) => <option key={`${index}-${header}`} value={header}>{header}</option>)}</select></Field>)}<Field label="Flokkur fyrir allar færslur"><select className={inputClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Nota sjálfvirka flokkun</option>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><div className="self-end"><Button type="button" variant="secondary" className="w-full" onClick={() => persistPreferences({ ...preferences, mappings: { ...preferences.mappings, [mappingKey(headers)]: selected } })}>Muna dálkastillingar</Button></div></fieldset></section>

        <section aria-labelledby="import-rules-heading" className="rounded-lg border border-line/10 p-4"><h3 id="import-rules-heading" className="text-sm font-semibold">Mínar flokkunarreglur <span className="font-normal text-ink/55">· valfrjálst</span></h3><p className="mt-2 text-xs leading-relaxed text-ink/65">Veldu flokk fyrir færslur sem innihalda ákveðinn texta, til dæmis nafn verslunar. Fyrsta reglan sem passar ræður flokkuninni. Þú getur breytt flokknum við yfirferð. Reglurnar og dálkastillingarnar eru vistaðar fyrir aðganginn þinn í þessum vafra; skráin sjálf og innihald hennar eru ekki geymd þar.</p><fieldset disabled={locked} className="mt-4 grid gap-3 sm:grid-cols-2"><legend className="sr-only">Bæta við flokkunarreglu</legend><Field label="Texti í lýsingu"><input className={inputClass} value={rulePattern} maxLength={80} placeholder="T.d. Bónus" onChange={(event) => setRulePattern(event.target.value)} /></Field><Field label="Flokkur reglunnar"><select className={inputClass} value={ruleCategory} onChange={(event) => setRuleCategory(event.target.value)}><option value="">Velja flokk</option>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Button type="button" variant="secondary" disabled={!rulePattern.trim() || !ruleCategory || preferences.rules.length >= 30} onClick={() => { persistPreferences({ ...preferences, rules: [...preferences.rules, { pattern: rulePattern.trim(), categoryId: ruleCategory }] }); setRulePattern(""); }}>Vista reglu</Button></fieldset>{preferences.rules.length ? <ul className="mt-4 divide-y divide-line/10">{preferences.rules.map((rule, index) => <li key={`${index}-${rule.pattern}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"><span className="break-words">„{rule.pattern}“ → {categoryNames.get(rule.categoryId) ?? "Flokkur ekki tiltækur"}</span><Button type="button" variant="secondary" disabled={locked} onClick={() => persistPreferences({ ...preferences, rules: preferences.rules.filter((_, ruleIndex) => index !== ruleIndex) })}>Fjarlægja reglu</Button></li>)}</ul> : <p className="mt-3 text-xs text-ink/55">Þú hefur ekki vistað neinar flokkunarreglur.</p>}{preferenceMessage ? <p role="status" className="mt-3 text-xs leading-relaxed text-accent">{preferenceMessage}</p> : null}</section>

        <section aria-labelledby="import-review-heading"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 id="import-review-heading" ref={reviewHeading} tabIndex={-1} className="scroll-mt-24 text-base font-semibold focus:outline-none">Yfirfara færslur</h3><p className="mt-1 text-xs leading-relaxed text-ink/60">Yfirfarðu tillögur að flokkun og staðfestu færslurnar. Ef þú breytir færslu eða flokki þarftu að staðfesta hana aftur.</p></div><p role="status" className="text-xs font-medium text-ink/70">{unresolved.length} eftir að yfirfara</p></div>
          <dl className="my-4 grid gap-4 sm:grid-cols-3"><div><dt className="text-xs text-ink/60">Verða fluttar inn</dt><dd className="mt-1 text-xl font-semibold">{number(included.length)}</dd></div><div><dt className="text-xs text-ink/60">Útgjöld samtals</dt><dd className="mt-1 break-words text-xl font-semibold">{money(total)}</dd></div><div><dt className="text-xs text-ink/60">Sleppt</dt><dd className="mt-1 text-xl font-semibold">{number(skipped.length)}</dd></div></dl>
          {!duplicateReady ? <div role={duplicateError ? "alert" : "status"} className="mb-4 rounded-lg border border-line/10 p-3 text-sm"><p>{duplicateError || "Ber saman dagsetningu, upphæð og lýsingu við skráðar færslur…"}</p>{duplicateError ? <Button type="button" variant="secondary" className="mt-3" onClick={() => setDuplicateAttempt((value) => value + 1)}>Athuga aftur</Button> : null}</div> : null}
          {Object.keys(duplicates).length ? <div className="mb-4 rounded-lg border border-gold/25 bg-gold/5 p-4"><p className="text-sm font-semibold">Mögulegar tvítekningar: {number(Object.keys(duplicates).length)}</p><p className="mt-1 text-xs leading-relaxed text-ink/65">Tvær greiðslur geta haft sömu dagsetningu, upphæð og lýsingu. Þú velur hvort flytja eigi báðar inn eða sleppa annarri.</p><Button type="button" variant="secondary" className="mt-3" disabled={locked || !duplicateReady} onClick={() => setDecisions((previous) => ({ ...previous, ...Object.fromEntries(Object.keys(duplicates).map((index) => [index, "skip"])) }))}>Sleppa öllum mögulegum tvítekningum ({number(Object.keys(duplicates).length)})</Button></div> : null}
          {rows.length ? <div className="overflow-hidden rounded-lg border border-line/10"><div className="flex flex-wrap items-center justify-between gap-3 bg-muted/25 p-4"><p className="text-xs text-ink/65">Síða {actualPage + 1} af {Math.ceil(rows.length / IMPORT_PAGE_SIZE)} · Færslur alls: {number(rows.length)}</p><Button type="button" variant="secondary" disabled={locked || !duplicateReady} onClick={() => setConfirmations((previous) => ({ ...previous, ...Object.fromEntries(pageRows.filter((row) => !["skip", "undecided"].includes(decisionFor(row))).map((row) => [row.sourceIndex, importReviewKey(row, decisionFor(row))])) }))}>Staðfesta færslur á þessari síðu</Button></div><div className="divide-y divide-line/10">{pageRows.map((row) => {
            const decision = decisionFor(row); const duplicate = duplicates[row.sourceIndex];
            return <article key={row.sourceIndex} className="space-y-3 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-sm font-semibold">{row.note}</p><p className="mt-1 text-xs text-ink/55">Færsla {row.sourceIndex + 1} í skrá · {displayDate(row.date)}</p></div><strong className="break-words text-sm font-semibold">{money(row.amount)}</strong></div>{duplicate ? <p className="flex items-start gap-2 text-xs leading-relaxed text-gold"><WarningCircleIcon size={16} className="shrink-0" aria-hidden="true" />{duplicateLabels[duplicate]}</p> : null}<fieldset disabled={locked} className="grid gap-3 sm:grid-cols-2"><legend className="sr-only">Yfirferð færslu {row.sourceIndex + 1}</legend><Field label={`Flokkur færslu ${row.sourceIndex + 1}`}><select className={inputClass} value={row.category_id ?? ""} disabled={decision === "skip"} onChange={(event) => setOverrides((previous) => ({ ...previous, [row.sourceIndex]: event.target.value }))}><option value="">Óflokkað</option>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label={`Aðgerð fyrir færslu ${row.sourceIndex + 1}`}><select className={inputClass} value={decision} onChange={(event) => setDecisions((previous) => ({ ...previous, [row.sourceIndex]: event.target.value as ImportDecision }))}>{duplicate ? <><option value="undecided">Veldu hvort flytja eigi færsluna inn</option><option value="import_duplicate">Flytja inn þótt hún gæti verið tvítekin</option></> : <option value="import">Flytja inn</option>}<option value="skip">Sleppa þessari færslu</option></select></Field><label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-accent" disabled={decision === "skip" || decision === "undecided" || !duplicateReady} checked={decision === "skip" || isReviewed(row)} onChange={(event) => setConfirmations((previous) => ({ ...previous, [row.sourceIndex]: event.target.checked ? importReviewKey(row, decision) : "" }))} />{decision === "skip" ? "Sleppt" : `Færsla ${row.sourceIndex + 1} yfirfarin`}</label></fieldset></article>;
          })}</div><Pagination page={actualPage} count={rows.length} disabled={busy} label="Síður innflutnings" onChange={(page) => goToPage(page)} /></div> : <EmptyState>Engar útgjaldafærslur eru tilbúnar til innflutnings. Athugaðu dálkavalið og skýringarnar við færslurnar hér fyrir neðan.</EmptyState>}
          {unresolved.length > 0 && rows.length > IMPORT_PAGE_SIZE ? <Button type="button" variant="secondary" className="mt-3" disabled={busy} onClick={() => goToPage(Math.floor(rows.findIndex((row) => row.sourceIndex === unresolved[0].sourceIndex) / IMPORT_PAGE_SIZE))}>Fara í næstu færslu sem þarf að yfirfara</Button> : null}
        </section>

        <section aria-labelledby="import-excluded-heading"><h3 id="import-excluded-heading" ref={excludedHeading} tabIndex={-1} className="scroll-mt-24 text-sm font-semibold focus:outline-none">Færslur sem verða ekki fluttar inn · {number(review.excluded.length)}</h3><p className="mt-1 text-xs leading-relaxed text-ink/60">Hér sérðu hvers vegna ekki er hægt að flytja þessar færslur inn. Breyttu dálkavalinu eða skránni ef eitthvað er rangt. Ef skráin hefur fleiri en 1.000 útgjaldafærslur þarftu að skipta henni í minni skrár.</p>{review.excluded.length ? <><dl className="my-4 grid gap-2 text-xs sm:grid-cols-2">{Object.entries(excludedReasonLabels).map(([reason, label]) => { const count = review.excluded.filter((row) => row.reason === reason).length; return count ? <div key={reason} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold">{number(count)}</dd></div> : null; })}</dl><div className="overflow-hidden rounded-lg border border-line/10"><ul className="divide-y divide-line/10">{excludedRows.map((row) => <li key={row.sourceIndex} className="p-4 text-xs"><p className="break-words font-semibold">Færsla {row.sourceIndex + 1}: {row.note}</p><p className="mt-1 break-words text-ink/60">{row.date || "Engin dagsetning"} · {row.amount || "Engin upphæð"}</p><p className="mt-2 text-coral">{excludedReasonLabels[row.reason]}</p></li>)}</ul><Pagination page={actualExcludedPage} count={review.excluded.length} disabled={busy} label="Færslur sem verða ekki fluttar inn" onChange={(page) => goToPage(page, true)} /></div></> : <p className="mt-3 text-xs text-ink/60">Hægt er að flytja inn allar færslur úr skránni eftir yfirferð.</p>}</section>
      </div>}
    </div>
    {hasReview ? <footer className="border-t border-line/10 bg-muted/20 p-4 sm:p-6">{importError ? <p role="alert" className="mb-4 rounded-lg border border-coral/20 bg-coral/5 p-3 text-sm leading-relaxed text-coral">{importError}</p> : null}<div className="flex flex-wrap items-center justify-between gap-4"><p className="max-w-lg text-xs leading-relaxed text-ink/65">{unresolved.length ? `Eftir að yfirfara: ${number(unresolved.length)}. Staðfestu færslurnar og veldu hvað á að gera við mögulegar tvítekningar.` : "Allt er yfirfarið. Færslur sem þú valdir að sleppa verða ekki fluttar inn."} Staðfestu innflutninginn til að vista færslurnar.</p><Button type="button" disabled={!rows.length || busy || !duplicateReady || unresolved.length > 0} onClick={() => void submitImport()}>{isImporting ? <><SpinnerGapIcon size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Vista færslur…</> : <>{included.length ? `Flytja inn færslur (${number(included.length)})` : "Ljúka án innflutnings"}<ArrowRightIcon size={17} aria-hidden="true" /></>}</Button></div></footer> : null}
    <div className="border-t border-line/10 p-4 sm:p-6"><p className="text-xs leading-relaxed text-ink/60">Vistað í þessum vafra · Skráarsnið: {Object.keys(preferences.mappings).length} · Flokkunarreglur: {preferences.rules.length}. Skrárnar sjálfar og innihald þeirra eru ekki geymd í vafranum.</p><Button type="button" variant="secondary" className="mt-3" disabled={locked || !Object.keys(preferences.mappings).length && !preferences.rules.length} onClick={forgetPreferences}>Eyða vistuðum dálkastillingum og reglum</Button>{!hasReview && preferenceMessage ? <p role="status" className="mt-3 text-xs leading-relaxed text-accent">{preferenceMessage}</p> : null}</div>
  </Card>;
}
