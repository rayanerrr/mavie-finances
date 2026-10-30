"use client";

import { monthLabel } from "@/lib/money";

export function MonthPicker({
  month,
  months,
  onChange,
}: {
  month: string;
  months: string[];
  onChange: (month: string) => void;
}) {
  const options = Array.from(new Set(months.concat(month))).sort().reverse();
  return (
    <label className="month-picker">
      <span>Mois</span>
      <select value={month} onChange={(e) => onChange(e.target.value)}>
        {options.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>
    </label>
  );
}
