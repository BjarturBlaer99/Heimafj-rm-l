// Some mobile/browser runtimes fall back to English for is-IS. Keep the app's
// Icelandic dates and ISK separators identical on every supported device.
const months = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
const shortMonths = ['jan.', 'feb.', 'mar.', 'apr.', 'maí', 'jún.', 'júl.', 'ágú.', 'sep.', 'okt.', 'nóv.', 'des.'];

export function formatISK(value: number) {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} kr.`;
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthStart(key: string) {
  return `${key}-01`;
}

export function shiftMonth(key: string, offset: number) {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return monthKey(date);
}

export function monthLabel(key: string, length: 'long' | 'short' = 'long') {
  const [year, month] = key.split('-').map(Number);
  if (month < 1 || month > 12) return '—';
  return length === 'long' ? `${months[month - 1]} ${year}` : shortMonths[month - 1];
}

export function formatDate(value: string) {
  const [, month, day] = value.split('-').map(Number);
  return shortMonths[month - 1] && day ? `${day}. ${shortMonths[month - 1]}` : '—';
}
