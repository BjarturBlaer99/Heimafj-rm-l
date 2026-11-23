// Amount drafts keep the decimal comma, including while the last digit is being
// typed. Invalid pasted input is preserved for validation, never reinterpreted.
export function amountDraft(raw: string): string {
  const text = raw.replace(/\s/g, '');
  if (!text) return '';
  if (/^\d+\.\d{1,2}$/.test(text)) return amountDraft(text.replace('.', ','));
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d*)?$/.test(text) && !/^,\d*$/.test(text)) return raw;
  const [whole, fraction] = text.split(',');
  const digits = whole.replaceAll('.', '').replace(/^0+(?=\d)/, '') || '0';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction === undefined ? '' : `,${fraction}`);
}

export function editAmountDraft(previous: string, raw: string, key: string): string {
  let at = 0;
  while (at < Math.min(previous.length, raw.length) && previous[at] === raw[at]) at++;
  const inserted = raw.length === previous.length + 1 && raw.slice(at + 1) === previous.slice(at);
  const deleted = raw.length === previous.length - 1 && previous.slice(at + 1) === raw.slice(at);
  const validPrevious = /^(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d*)?$/.test(previous) || !previous;
  if (validPrevious && (inserted && /^[\d,.]$/.test(key) && raw[at] === key || deleted && key === 'Backspace')) {
    if (inserted && key === '.' && !previous.includes(',')) raw = raw.slice(0, at) + ',' + raw.slice(at + 1);
    if (deleted && previous[at] === '.' && at > 0) raw = raw.slice(0, at - 1) + raw.slice(at);
    if (/^[\d.]*(?:,\d*)?$/.test(raw)) return amountDraft(raw.replaceAll('.', ''));
  }
  return amountDraft(raw);
}

export function amountFromNumber(value: number | undefined): string {
  return value === undefined ? '' : amountDraft(String(value).replace('.', ','));
}
