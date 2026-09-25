import type { Category } from "@/lib/types";

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

export function normalize(value: string) {
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

export async function readCsvText(file: File) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("\uFFFD")) return utf8;
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

export function parseCsv(text: string) {
  const delimiter = detectDelimiter(text);
  const lines: string[] = [];
  let line = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { line += '""'; index += 1; continue; }
    if (character === '"') quoted = !quoted;
    if ((character === "\n" || character === "\r") && !quoted) {
      if (line.trim()) lines.push(line);
      line = "";
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else line += character;
  }
  if (line.trim()) lines.push(line);
  return rowsToObjects(lines.map((line) => splitCsvLine(line, delimiter)));
}

export function detectHeader(headers: string[], candidates: string[], excluded: string[] = []) {
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

export function parseAmount(value: string) {
  let cleaned = value.replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  cleaned = cleaned.replace(/^[,.]+|[,.]+$/g, "");
  if (!cleaned) return 0;

  const sign = cleaned.startsWith("-") || /^\s*\(.*\)\s*$/.test(value) ? -1 : 1;
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

export function parseDate(value: string) {
  const trimmed = value.trim();
  if (/^\d{5}(?:\.\d+)?$/.test(trimmed)) {
    const serial = Number(trimmed);
    if (serial >= 20000 && serial < 100000) return new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000).toISOString().slice(0, 10);
  }
  const dateOnly = trimmed.split(/[ T]/)[0] ?? trimmed;
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
      throw new Error("Ekki er hægt að lesa þessa Excel-skrá. Vistaðu hana sem CSV-skrá og reyndu aftur.");
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

export async function readXlsxRows(file: File) {
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
  if (!sheetXml) throw new Error("Ekki fannst vinnublað í Excel-skránni. Athugaðu skrána og reyndu aftur.");

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

export function guessCategoryId(note: string, merchantType: string, categories: Category[]) {
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
