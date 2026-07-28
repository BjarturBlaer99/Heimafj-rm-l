export function money(value: number, currency = "ISK") {
  const numericValue = Number(value);
  const roundedValue = Number.isFinite(numericValue) ? Math.round(numericValue) : 0;
  const sign = roundedValue < 0 ? "-" : "";
  const groupedValue = Math.abs(roundedValue)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${groupedValue}\u00a0${currency === "ISK" ? "kr." : currency}`;
}

export function percent(value: number) {
  return `${Math.round(value)}%`;
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function monthStart(month = currentMonth()) {
  return `${month}-01`;
}

export function isoDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}
