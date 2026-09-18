export type SavingsPlan =
  | { status: "unavailable" | "undated" | "overdue" | "met"; remaining: number }
  | { status: "active"; remaining: number; months: number; monthlyAmount: number };

export function isCalendarDate(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Equal contributions, including the current month and the target month; no growth. */
export function savingsPlan(balance: number, target: number, targetDate: string | null, today: string): SavingsPlan {
  if (!Number.isFinite(balance) || !Number.isFinite(target) || balance < 0 || target <= 0 || !isCalendarDate(today)) return { status: "unavailable", remaining: 0 };
  const remaining = Math.max(0, target - balance);
  if (remaining === 0) return { status: "met", remaining };
  if (!targetDate) return { status: "undated", remaining };
  if (!isCalendarDate(targetDate)) return { status: "unavailable", remaining };
  if (targetDate < today) return { status: "overdue", remaining };
  const [year, month] = today.split("-").map(Number);
  const [targetYear, targetMonth] = targetDate.split("-").map(Number);
  const months = (targetYear - year) * 12 + targetMonth - month + 1;
  return { status: "active", remaining, months, monthlyAmount: Math.ceil(remaining / months) };
}
