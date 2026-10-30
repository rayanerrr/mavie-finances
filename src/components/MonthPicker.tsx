"use client";
export function MonthPicker({ month, months, onChange }: { month: string; months: string[]; onChange: (month: string) => void }) {
  void months;
  return <label className="month-picker"><span>Mois</span><input type="month" value={month} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) onChange(e.target.value); }}/></label>;
}
