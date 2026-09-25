/** Icelandic input: dots group thousands; a comma separates decimal places. */
export function amountInput(raw: string) {
  const compact = raw.replace(/\s/g, "");
  // Never turn malformed or foreign-formatted amounts into a different number.
  if (!/^-?[\d.]*(?:,\d*)?$/.test(compact)) return { display: raw, value: null };
  const plain = compact.replace(/\./g, "");
  if (!plain || plain === "-") return { display: plain, value: plain ? null : "" };
  const [whole, fraction] = plain.split(",");
  const negative = whole.startsWith("-");
  const digits = whole.replace(/^-/, "").replace(/^0+(?=\d)/, "") || "0";
  const integer = `${negative ? "-" : ""}${digits}`;
  return {
    display: `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${fraction === undefined ? "" : `,${fraction}`}`,
    value: `${integer}${fraction ? `.${fraction}` : ""}`
  };
}

export function displayAmount(value: string | number | undefined) {
  if (value === undefined || value === "") return "";
  return amountInput(String(value).replace(".", ",")).display;
}

export function editAmount(previous: string, raw: string, caret: number, inputType = "") {
  let next = raw;
  let position = caret;
  // Deleting an automatically inserted dot must also delete the adjacent digit,
  // otherwise formatting immediately restores the dot and traps the caret.
  if (previous.length === raw.length + 1 && amountInput(raw).display === previous) {
    const backwards = inputType === "deleteContentBackward";
    const forwards = inputType === "deleteContentForward";
    const index = backwards ? caret - 1 : caret;
    if ((backwards || forwards) && /\d/.test(raw[index] ?? "")) {
      next = raw.slice(0, index) + raw.slice(index + 1);
      position = backwards ? index : caret;
    }
  }
  const result = amountInput(next);
  if (result.value === null) return { ...result, caret: position };
  let meaningful = next.slice(0, position).replace(/[.\s]/g, "").length;
  let formattedCaret = 0;
  while (formattedCaret < result.display.length && meaningful > 0) {
    if (result.display[formattedCaret] !== ".") meaningful--;
    formattedCaret++;
  }
  return { ...result, caret: formattedCaret };
}

export function amountInputError(raw: string, min?: string | number, max?: string | number, step?: string | number) {
  const { value } = amountInput(raw);
  if (value === "") return ""; // Native required validation handles empty fields.
  if (value === null || !Number.isFinite(Number(value))) return "Sláðu inn upphæð. Notaðu kommu fyrir aukastafi, til dæmis 1.250,50.";
  const number = Number(value);
  if (min !== undefined && number < Number(min)) return `Upphæðin þarf að vera að minnsta kosti ${displayAmount(min)} kr.`;
  if (max !== undefined && number > Number(max)) return `Upphæðin má ekki vera hærri en ${displayAmount(max)} kr.`;
  if (step !== undefined && step !== "any" && Number(step) > 0) {
    const increments = (number - Number(min ?? 0)) / Number(step);
    if (Math.abs(increments - Math.round(increments)) > 0.00001) {
      if (Number(step) === 1) return "Sláðu inn upphæð í heilum krónum.";
      if (Number(step) === 0.01) return "Notaðu í mesta lagi tvo aukastafi.";
      return `Upphæðin þarf að fylgja ${displayAmount(step)} kr. skrefum frá ${displayAmount(min ?? 0)} kr.`;
    }
  }
  return "";
}
