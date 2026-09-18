export function csvCell(value: unknown) {
  const text = String(value ?? "");
  // A spreadsheet must treat imported descriptions as text, never formulas.
  const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function transactionsCsv(rows: Array<Record<string, unknown>>) {
  const fields = ["id", "date", "type", "amount", "currency", "category_id", "note"];
  return "\uFEFF" + [fields.map(csvCell).join(","), ...rows.map((row) => fields.map((key) => csvCell(key === "currency" ? "ISK" : row[key])).join(","))].join("\r\n");
}
