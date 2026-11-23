export const maximumAmount = 9999999999.99;

export function validateAmount(value: number, allowZero = false): number {
  if (!Number.isFinite(value) || value > maximumAmount || (allowZero ? value < 0 : value <= 0) || Math.abs(value * 100 - Math.round(value * 100)) > 0.001) {
    throw new Error(allowZero ? 'Upphæð þarf að vera núll eða hærri, með mest tveimur aukastöfum.' : 'Upphæð þarf að vera hærri en núll, með mest tveimur aukastöfum.');
  }
  return Math.round(value * 100) / 100;
}

// A comma is a decimal separator. Dots may group thousands in Icelandic
// notation, or separate one/two decimal digits. Mixed foreign notation fails.
export function parseAmount(text: string): number {
  const value = text.trim();
  let normalized: string;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(value)) normalized = value.replaceAll('.', '').replace(',', '.');
  else if (/^\d+(?:[,.]\d{1,2})?$/.test(value)) normalized = value.replace(',', '.');
  else throw new Error('Sláðu inn gilda upphæð, til dæmis 1.234,56 eða 1234.56.');
  return validateAmount(Number(normalized), true);
}

export function validateDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Dagsetning þarf að vera á sniðinu ÁÁÁÁ-MM-DD.');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('Dagsetningin er ekki gild.');
  return value;
}

export function validateMonth(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) throw new Error('Mánuður þarf að vera á sniðinu ÁÁÁÁ-MM.');
  validateDate(`${value}-01`);
  return value;
}

export function validateId(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error('Færslan fannst ekki. Uppfærðu síðuna og reyndu aftur.');
  return value;
}

export function validateText(value: string, label: string, max: number, min = 1): string {
  const text = value.trim();
  if (text.length < min || text.length > max) throw new Error(`${label} þarf að vera ${min}–${max} stafir.`);
  return text;
}

export function validateNote(value?: string | null): string | null {
  return value ? validateText(value, 'Lýsing', 500, 0) || null : null;
}

export function localToday(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function financeError(error: { code?: string; status?: number } | null | undefined, fallback = 'Ekki tókst að vista breytinguna. Athugaðu tenginguna og reyndu aftur.'): Error {
  if (error?.code === '23505') return new Error('Þessi færsla er þegar skráð. Uppfærðu síðuna.');
  if (error?.code === '23503') return new Error('Tengd færsla fannst ekki. Uppfærðu síðuna og reyndu aftur.');
  if (error?.code === '42501' || error?.code === 'PGRST301' || error?.status === 401) return new Error('Innskráningin er útrunnin. Skráðu þig aftur inn.');
  return new Error(fallback);
}
