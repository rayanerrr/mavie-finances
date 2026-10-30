const currency = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
});

const currencyShort = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export function formatMoney(amount: number): string {
  return currency.format(amount);
}

export function formatMoneyShort(amount: number): string {
  return currencyShort.format(Math.round(amount));
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("fr-CA", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function monthTitle(monthKey: string): string {
  const label = monthLabel(monthKey);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthName(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-CA", { month: "long" }).format(
    new Date(year, month - 1, 1),
  );
}

export function currentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return currentMonthKey(new Date(year, month - 2, 1));
}

export function nextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return currentMonthKey(new Date(year, month, 1));
}

export function monthKeyFromDate(dateStr: string): string {
  return dateStr.slice(0, 7);
}
