"use client";

import { useMemo, useState } from "react";
import { Button, Card, EmptyState, Field, SectionHeader, inputClass } from "@/components/ui";
import { importTransactionsForClient } from "@/lib/actions";
import { money } from "@/lib/format";
import type { Category } from "@/lib/types";

type ImportRow = {
  date: string;
  note: string;
  amount: number;
  type: "expense";
  category_id: string | null;
};

const maxImportRows = 1000;

const sampleCsv = `Dagsetning;Lýsing;Tegund;Upphæð
2026-04-01;Bónus;Grocery Stores, Supermarkets;-8234
2026-04-02;Greiðsla inn á kort;;620000
2026-04-03;Rafmagn;Utilities;-14620`;

const merchantKeywordHints: Record<string, string[]> = {
  housing: ["leiga", "husaleiga", "rent", "mortgage", "fasteign", "ibud", "husfelag", "husnaedi"],
  food: [
    "bonus",
    "bonusskeifunni",
    "kronan",
    "kronanflatahrauni",
    "kronannordurhella",
    "kronangrafarholt",
    "netto",
    "nettoselhella",
    "hagkaup",
    "hagkaupskeifan",
    "costco",
    "krambudin",
    "dominos",
    "dominosnordurhell",
    "subway",
    "subwayfjardargata",
    "teogkaffi",
    "teogkaffivefur",
    "matur",
    "groceries",
    "restaurant",
    "cafe",
    "bakari",
    "bakarameistarinn",
    "bakarameistarinnflata",
    "holtanesti",
    "worldclasstjarnavellir",
    "tjarnavellir",
    "localdalshrauni",
    "local",
    "lemon",
    "lemonhjallahraun",
    "kfc",
    "kfcthjodhildarstig",
    "isbud",
    "isbudhuppu"
  ],
  transport: ["n1", "olis", "orkan", "costcofuel", "straeto", "bus", "taxi", "uber", "lyft", "parking", "parka", "strparka", "bensin", "ds"],
  utilities: ["rafmagn", "orveita", "vodafone", "siminn", "nova", "hitasveita", "internet", "electric", "utilities"],
  shopping: [
    "zara",
    "hm",
    "ikea",
    "amazon",
    "elko",
    "shopping",
    "verslun",
    "byko",
    "kidscoolshop",
    "kidscoolshopsmarat",
    "barnaloppan",
    "blafjola",
    "byggtogbuid",
    "byggtogbuidehf",
    "byggtogbuidis",
    "kokkais",
    "gardheimar",
    "gardheimarehf",
    "gaeludyr",
    "gaeludyris",
    "nexus",
    "nexuskringlan"
  ],
  health: [
    "lyf",
    "laeknir",
    "doctor",
    "hospital",
    "sjukra",
    "heilsu",
    "health",
    "dentist",
    "tann",
    "apotek",
    "apotekhafnarfjardar",
    "lyfjaval",
    "dyralaeknastofa",
    "dyralaeknastofadagfin",
    "kpi",
    "kpisjalfsafgreidslu",
    "kristinntomasson",
    "worldclass",
    "worldclasstjarnarvol",
    "laugar"
  ],
  entertainment: ["bio", "playstation", "xbox", "steam", "skemmtun", "entertainment", "leikhus", "truecrimeisland"],
  askriftir: [
    "netflix",
    "spotify",
    "disney",
    "youtubepremium",
    "youtube",
    "icloud",
    "applecombill",
    "apple",
    "patreon",
    "audible",
    "strava",
    "chatgpt",
    "openai",
    "claude",
    "claudeaisubscription",
    "anthropic",
    "grammarly",
    "grammarlyco",
    "marvel",
    "helpmarvelcom",
    "subscription",
    "askrift",
    "membership",
    "abcbarnahjalp"
  ],
  salary: ["laun", "salary", "payroll"],
  freelance: ["freelance", "verktaka", "invoice", "reikningur"],
  savings: ["sparnadur", "savings", "investment", "broker", "sjodur", "hlutabref", "revolut", "moneytransfer"],
  other: []
};

const typeKeywordHints: Record<string, string[]> = {
  food: ["grocery", "supermarket", "restaurants", "restaurant", "fastfood", "bakeries", "confectionery", "eatingplaces"],
  transport: ["automobileparking", "parking", "fuel", "transportation"],
  utilities: ["telecommunication", "utilities", "internet"],
  shopping: ["clothing", "furniture", "appliance", "garden", "books", "newspa", "petshops", "childrensandinfantswear", "equipment", "householdappliance", "familyclothing"],
  health: ["health", "medical", "doctor", "doctors", "pharmacies", "drugstores", "veterinary", "beautyspas", "healthpractitioners"],
  entertainment: ["games", "recreation", "audiovis", "digitalgoodsgames"],
  askriftir: ["computersoftware", "digitalgoodsmulticategory", "membership", "clubscountryclubs"],
  savings: ["moneytransfer"],
  other: ["otherservices"]
};

function splitCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/).find(Boolean) ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  if (tabs > semicolons && tabs > commas) return "\t";
  return semicolons >= commas ? ";" : ",";
}

function normalize(value: string) {
  return value
    .replaceAll("Ã°", "ð")
    .replaceAll("Ã¾", "þ")
    .replaceAll("Ã¦", "æ")
    .replaceAll("Ã¶", "ö")
    .replaceAll("Ã½", "ý")
    .replaceAll("Ã³", "ó")
    .replaceAll("Ã¡", "á")
    .replaceAll("Ã­", "í")
    .replaceAll("Ãº", "ú")
    .replaceAll("Ã©", "é")
    .replaceAll("ð", "d")
    .replaceAll("þ", "th")
    .replaceAll("æ", "ae")
    .replaceAll("ö", "o")
    .replaceAll("ý", "y")
    .replaceAll("ó", "o")
    .replaceAll("á", "a")
    .replaceAll("í", "i")
    .replaceAll("ú", "u")
    .replaceAll("é", "e")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function readCsvText(file: File) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("Ã")) return utf8;
  return new TextDecoder("windows-1252").decode(buffer);
}

function findHeaderIndex(rows: string[][]) {
  const index = rows.findIndex((row) => {
    const normalized = row.map(normalize);
    return normalized.some((cell) => cell.includes("dagsetning") || cell.includes("date")) &&
      normalized.some((cell) => cell.includes("upph") || cell.includes("amount") || cell.includes("debet") || cell.includes("kredit"));
  });
  return index >= 0 ? index : 0;
}

function rowsToObjects(rawRows: string[][]) {
  const headerIndex = findHeaderIndex(rawRows);
  const headers = rawRows[headerIndex] ?? [];
  const rows = rawRows
    .slice(headerIndex + 1)
    .filter((row) => row.some((value) => value.trim().length > 0))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
  return { headers, rows };
}

function parseCsv(text: string) {
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return rowsToObjects(lines.map((line) => splitCsvLine(line, delimiter)));
}

function detectHeader(headers: string[], candidates: string[], excluded: string[] = []) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalize(header)
  }));

  const filteredHeaders = normalizedHeaders.filter(({ normalized }) => !excluded.some((candidate) => normalized.includes(candidate)));

  for (const candidate of candidates) {
    const exact = filteredHeaders.find((header) => header.normalized === candidate);
    if (exact) return exact.original;
  }
  for (const candidate of candidates) {
    const startsWith = filteredHeaders.find((header) => header.normalized.startsWith(candidate));
    if (startsWith) return startsWith.original;
  }
  for (const candidate of candidates) {
    const partial = filteredHeaders.find((header) => header.normalized.includes(candidate));
    if (partial) return partial.original;
  }

  return "";
}

function parseAmount(value: string) {
  let cleaned = value.replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  cleaned = cleaned.replace(/^[,.]+|[,.]+$/g, "");
  if (!cleaned) return 0;

  const sign = cleaned.startsWith("-") ? -1 : 1;
  const unsigned = cleaned.replace(/^-/, "");
  const separators = [...unsigned.matchAll(/[,.]/g)].map((match) => ({ index: match.index ?? 0 }));

  if (separators.length === 0) return sign * Number(unsigned);

  const last = separators[separators.length - 1];
  const decimals = unsigned.length - last.index - 1;
  const isDecimal = decimals > 0 && decimals <= 2;

  if (!isDecimal) return sign * Number(unsigned.replace(/[,.]/g, ""));

  const integerPart = unsigned.slice(0, last.index).replace(/[,.]/g, "");
  const decimalPart = unsigned.slice(last.index + 1);
  return sign * Number(`${integerPart}.${decimalPart}`);
}

function parseDate(value: string) {
  const trimmed = value.trim();
  const dateOnly = trimmed.split(" ")[0] ?? trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
  const match = dateOnly.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function columnIndex(cellRef: string) {
  const letters = cellRef.replace(/\d+/g, "");
  return letters.split("").reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function xmlText(node: ParentNode, selector: string) {
  return node.querySelector(selector)?.textContent ?? "";
}

async function unzipEntries(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();
  let offset = 0;

  while (offset < bytes.length - 30) {
    const signature = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
    if (signature !== 0x04034b50) break;

    const flags = bytes[offset + 6] | (bytes[offset + 7] << 8);
    const method = bytes[offset + 8] | (bytes[offset + 9] << 8);
    const compressedSize = bytes[offset + 18] | (bytes[offset + 19] << 8) | (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24);
    const fileNameLength = bytes[offset + 26] | (bytes[offset + 27] << 8);
    const extraLength = bytes[offset + 28] | (bytes[offset + 29] << 8);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + fileNameLength));

    if ((flags & 0x08) !== 0) {
      throw new Error("Þessi Excel skrá notar ZIP gagnalýsingu sem innflytjandinn styður ekki enn.");
    }

    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    if (method === 0) entries.set(name, compressed);
    else if (method === 8) {
      const stream = new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw")));
      entries.set(name, new Uint8Array(await stream.arrayBuffer()));
    }

    offset = dataStart + compressedSize;
  }

  return entries;
}

async function readXlsxRows(file: File) {
  const entries = await unzipEntries(file);
  const decoder = new TextDecoder();
  const parser = new DOMParser();
  const sharedXml = entries.get("xl/sharedStrings.xml");
  const sharedStrings = sharedXml
    ? Array.from(parser.parseFromString(decoder.decode(sharedXml), "application/xml").querySelectorAll("si")).map((item) =>
        Array.from(item.querySelectorAll("t")).map((part) => part.textContent ?? "").join("")
      )
    : [];

  const workbookXml = entries.get("xl/workbook.xml");
  const relsXml = entries.get("xl/_rels/workbook.xml.rels");
  const workbook = workbookXml ? parser.parseFromString(decoder.decode(workbookXml), "application/xml") : null;
  const rels = relsXml ? parser.parseFromString(decoder.decode(relsXml), "application/xml") : null;
  const firstSheetRelId = workbook?.querySelector("sheet")?.getAttribute("r:id") ?? "";
  const target = rels?.querySelector(`Relationship[Id="${firstSheetRelId}"]`)?.getAttribute("Target") ?? "worksheets/sheet1.xml";
  const sheetPath = `xl/${target.replace(/^\/?xl\//, "")}`;
  const sheetXml = entries.get(sheetPath) ?? entries.get("xl/worksheets/sheet1.xml");
  if (!sheetXml) throw new Error("Fann ekki fyrsta vinnublaðið í Excel skránni.");

  const sheet = parser.parseFromString(decoder.decode(sheetXml), "application/xml");
  const rows: string[][] = [];

  sheet.querySelectorAll("row").forEach((rowNode) => {
    const row: string[] = [];
    rowNode.querySelectorAll("c").forEach((cell) => {
      const ref = cell.getAttribute("r") ?? "";
      const index = columnIndex(ref);
      const type = cell.getAttribute("t");
      let value = "";
      if (type === "inlineStr") value = xmlText(cell, "is t");
      else {
        const raw = xmlText(cell, "v");
        value = type === "s" ? sharedStrings[Number(raw)] ?? "" : raw;
      }
      row[index] = value;
    });
    rows.push(row.map((value) => value ?? ""));
  });

  return rows;
}

function matchesHintCategory(category: Category, hintKey: string) {
  const normalizedCategoryName = normalize(category.name);
  if (!normalizedCategoryName) return false;

  const aliases: Record<string, string[]> = {
    housing: ["housing", "husnaedi"],
    food: ["food", "matur"],
    transport: ["transport", "samgongur"],
    utilities: ["utilities", "reikningar"],
    shopping: ["shopping", "innkaup"],
    health: ["health", "heilsa"],
    entertainment: ["entertainment", "afthreying"],
    askriftir: ["askriftir", "askrift", "subscriptions"],
    salary: ["salary", "laun"],
    freelance: ["freelance", "verktakavinna"],
    savings: ["savings", "sparnadur"],
    other: ["other", "annad"]
  };

  return (aliases[hintKey] ?? [hintKey]).some((alias) => normalizedCategoryName === alias || normalizedCategoryName.includes(alias));
}

function guessCategoryId(note: string, merchantType: string, categories: Category[]) {
  const normalizedNote = normalize(note);
  const normalizedType = normalize(merchantType);
  const combined = `${normalizedNote} ${normalizedType}`.trim();
  if (!combined) return null;

  for (const category of categories) {
    if (category.type === "income") continue;
    const normalizedCategoryName = normalize(category.name);
    if (normalizedCategoryName && combined.includes(normalizedCategoryName)) {
      return category.id;
    }
  }

  for (const [hintKey, keywords] of Object.entries(merchantKeywordHints)) {
    if (!keywords.some((keyword) => combined.includes(normalize(keyword)))) continue;
    const match = categories.find((category) => category.type !== "income" && matchesHintCategory(category, hintKey));
    if (match) return match.id;
  }

  for (const [hintKey, keywords] of Object.entries(typeKeywordHints)) {
    if (!keywords.some((keyword) => normalizedType.includes(normalize(keyword)))) continue;
    const match = categories.find((category) => category.type !== "income" && matchesHintCategory(category, hintKey));
    if (match) return match.id;
  }

  const otherCategory = categories.find((category) => {
    if (category.type === "income") return false;
    const normalizedCategoryName = normalize(category.name);
    return normalizedCategoryName === "other" || normalizedCategoryName === "annad";
  });

  return otherCategory?.id ?? null;
}

export function CsvImporter({ categories }: { categories: Category[] }) {
  const [csvText, setCsvText] = useState(sampleCsv);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const parsed = useMemo(() => parseCsv(csvText), [csvText]);
  const [dateColumn, setDateColumn] = useState("");
  const [noteColumn, setNoteColumn] = useState("");
  const [merchantTypeColumn, setMerchantTypeColumn] = useState("");
  const [amountColumn, setAmountColumn] = useState("");
  const [debitColumn, setDebitColumn] = useState("");
  const [creditColumn, setCreditColumn] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const headers = parsed.headers;
  const selected = {
    date: dateColumn || detectHeader(headers, ["dagsetning", "date", "bokunardagur", "valuedate"]),
    note: noteColumn || detectHeader(headers, ["motadili", "motaili", "lysing", "description", "texti", "skyring", "note", "merchant"]),
    merchantType: merchantTypeColumn || detectHeader(headers, ["tegund", "type", "flokkur", "mcc", "merchantcategory"]),
    amount: amountColumn || detectHeader(headers, ["upphaed", "amount", "amountisk", "fjhar", "hreyfing", "upph"], ["erlendumgjaldmidli", "foreigncurrency", "foreignamount", "currencyamount"]),
    debit: debitColumn || detectHeader(headers, ["debet", "debit", "utborgun", "withdrawal"]),
    credit: creditColumn || detectHeader(headers, ["kredit", "credit", "innborgun", "deposit", "greidsla", "payment"])
  };

  const detectedRows = parsed.rows
    .map((row): ImportRow | null => {
      const date = parseDate(row[selected.date] ?? "");
      const note = row[selected.note]?.trim() || "Innflutt færsla";
      const merchantType = row[selected.merchantType]?.trim() ?? "";
      const directAmount = selected.amount ? parseAmount(row[selected.amount] ?? "") : 0;
      const debit = selected.debit ? parseAmount(row[selected.debit] ?? "") : 0;
      const credit = selected.credit ? parseAmount(row[selected.credit] ?? "") : 0;
      const signedAmount = directAmount || credit - debit;

      if (!date || !Number.isFinite(signedAmount) || signedAmount >= 0) return null;

      const detectedCategoryId = categoryId || guessCategoryId(note, merchantType, categories);

      return {
        date,
        note,
        amount: Math.abs(signedAmount),
        type: "expense",
        category_id: detectedCategoryId
      };
    })
    .filter((row): row is ImportRow => Boolean(row));
  const importRows = detectedRows.slice(0, maxImportRows);

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const categorySummary = importRows.reduce<Record<string, { name: string; count: number; total: number }>>((summary, row) => {
    const label = row.category_id ? categoryNames.get(row.category_id) ?? "Óþekktur flokkur" : "Óflokkað";
    const current = summary[label] ?? { name: label, count: 0, total: 0 };
    current.count += 1;
    current.total += row.amount;
    summary[label] = current;
    return summary;
  }, {});
  const sortedCategorySummary = Object.values(categorySummary).sort((left, right) => right.total - left.total);

  function options() {
    return (
      <>
        <option value="">Velja dálk</option>
        {headers.map((header) => (
          <option key={header} value={header}>
            {header}
          </option>
        ))}
      </>
    );
  }

  async function loadFile(file: File | null) {
    if (!file) return;
    try {
      setFileError("");
      setFileName(file.name);
      if (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) {
        const rows = await readXlsxRows(file);
        setCsvText(rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n"));
        return;
      }
      setCsvText(await readCsvText(file));
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Ekki tókst að lesa skrána.");
    }
  }

  async function submitImport() {
    try {
      setIsImporting(true);
      setImportError("");
      const formData = new FormData();
      formData.set("rows", JSON.stringify(importRows));
      const result = await importTransactionsForClient(formData);
      window.location.assign(result.redirectTo);
    } catch (error) {
      setIsImporting(false);
      setImportError(error instanceof Error ? error.message : "Ekki tókst að flytja færslurnar inn.");
    }
  }

  return (
    <div className="grid gap-5">
      <Card>
        <SectionHeader title="Flytja inn bankaskrá" description="Veldu CSV, XLS eða XLSX og staðfestu dálkamöppun áður en færslur eru fluttar inn." />
        <div className="mb-4">
          <Field label="Veldu CSV eða Excel skrá">
            <input
              className={inputClass}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => void loadFile(event.target.files?.[0] ?? null)}
            />
          </Field>
          {fileName ? <p className="mt-2 text-sm text-ink/55">Skrá: {fileName}</p> : null}
          {fileError ? <p className="mt-2 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{fileError}</p> : null}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Field label="Gögn til innflutnings">
            <textarea className={`${inputClass} h-48 py-2 font-mono text-xs sm:h-72`} value={csvText} onChange={(event) => setCsvText(event.target.value)} />
          </Field>
          <div className="grid content-start gap-4">
            <Field label="Dagsetning">
              <select className={inputClass} value={selected.date} onChange={(event) => setDateColumn(event.target.value)}>
                {options()}
              </select>
            </Field>
            <Field label="Mótaðili eða lýsing">
              <select className={inputClass} value={selected.note} onChange={(event) => setNoteColumn(event.target.value)}>
                {options()}
              </select>
            </Field>
            <Field label="Tegund úr skrá">
              <select className={inputClass} value={selected.merchantType} onChange={(event) => setMerchantTypeColumn(event.target.value)}>
                {options()}
              </select>
            </Field>
            <Field label="Upphæð í einum dálki">
              <select className={inputClass} value={selected.amount} onChange={(event) => setAmountColumn(event.target.value)}>
                {options()}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Debet dálkur">
                <select className={inputClass} value={selected.debit} onChange={(event) => setDebitColumn(event.target.value)}>
                  {options()}
                </select>
              </Field>
              <Field label="Kredit dálkur">
                <select className={inputClass} value={selected.credit} onChange={(event) => setCreditColumn(event.target.value)}>
                  {options()}
                </select>
              </Field>
            </div>
            <Field label="Yfirskrifa flokk fyrir allar innfluttar færslur">
              <select className={inputClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">Nota sjálfvirka flokkun</option>
                {categories
                  .filter((category) => category.type !== "income")
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </Field>
            <p className="text-sm text-ink/60">Innflytjandinn notar nú bæði mótaðila og tegund úr bankaskránni til að flokka færslur betur. Aðeins útgjöld af korti eru flutt inn.</p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Forskoðun á kortaeyðslu" description="Yfirfarðu færslurnar og flokkunina áður en þú vistar þær." action={<Button type="button" disabled={importRows.length === 0 || isImporting} onClick={() => void submitImport()}>
            {isImporting ? "Flyt inn..." : `Flytja inn ${importRows.length} færslur`}
          </Button>} />
        {importError ? <div className="mb-4 rounded-lg border border-coral/20 bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{importError}</div> : null}
        {detectedRows.length > maxImportRows ? (
          <div className="mb-4 rounded-lg border border-coral/20 bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">
            Skráin inniheldur {detectedRows.length} gildar færslur. Fyrstu {maxImportRows} færslurnar verða fluttar inn í einu.
          </div>
        ) : null}
        {importRows.length ? (
          <>
            <div className="grid gap-2 sm:hidden">
              {importRows.slice(0, 25).map((row, index) => (
                <article key={`${row.date}-${index}`} className="rounded-md border border-line/10 bg-muted/25 p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.note}</p>
                      <p className="mt-0.5 text-xs text-ink/50">{row.date} · {row.category_id ? categoryNames.get(row.category_id) ?? "Óþekktur flokkur" : "Óflokkað"}</p>
                    </div>
                    <p className="shrink-0 font-bold text-coral">-{money(row.amount)}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-ink/55">
              <tr>
                <th className="pb-3">Dagsetning</th>
                <th className="pb-3">Lýsing</th>
                <th className="pb-3">Flokkur</th>
                <th className="pb-3">Tegund</th>
                <th className="pb-3 text-right">Upphæð</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/10">
              {importRows.slice(0, 25).map((row, index) => (
                <tr key={`${row.date}-${index}`}>
                  <td className="py-3">{row.date}</td>
                  <td className="py-3 font-semibold">{row.note}</td>
                  <td className="py-3">{row.category_id ? categoryNames.get(row.category_id) ?? "Óþekktur flokkur" : "Óflokkað"}</td>
                  <td className="py-3">Útgjöld</td>
                  <td className="py-3 text-right font-bold">{money(row.amount)}</td>
                </tr>
              ))}
            </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState>Engin gild kortaeyðsla fannst. Athugaðu dálkamöppun og skráarsnið.</EmptyState>
        )}
      </Card>

      {sortedCategorySummary.length ? (
        <Card>
          <SectionHeader title="Flokkunarsamantekt" description="Færslur og upphæðir eftir sjálfvirkri flokkun." />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sortedCategorySummary.map((item) => (
              <div key={item.name} className="rounded-lg border border-line/15 bg-surface/70 p-4">
                <p className="text-sm text-ink/60">{item.count} færslur</p>
                <p className="mt-1 font-semibold">{item.name}</p>
                <p className="mt-2 text-lg font-bold">{money(item.total)}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
