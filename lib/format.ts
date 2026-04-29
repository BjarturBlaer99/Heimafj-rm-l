export function money(value: number, currency = "ISK") {
  return new Intl.NumberFormat("is-IS", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
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
