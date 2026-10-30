"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MonthPicker } from "@/components/MonthPicker";
import { currentMonthKey, formatMoney, monthLabel } from "@/lib/money";

export default function RapportsPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [summary, setSummary] = useState<{
    months: string[];
    total: number;
    count: number;
    byCategory: Array<{ categoryName: string; total: number; count: number }>;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/insights?month=${month}`);
      if (res.ok) setSummary(await res.json());
    })();
  }, [month]);

  return (
    <AppShell
      title="Rapports"
      actions={
        <>
          <MonthPicker
            month={month}
            months={summary?.months ?? [month]}
            onChange={setMonth}
          />
          <a className="btn primary" href={`/api/reports/csv?month=${month}`}>
            Export CSV
          </a>
        </>
      }
    >
      {summary && (
        <section className="panel printable">
          <h2>Résumé · {monthLabel(month)}</h2>
          <p>
            <strong>{formatMoney(summary.total)}</strong> sur {summary.count}{" "}
            transactions
          </p>
          <ul className="list">
            {summary.byCategory.map((c) => (
              <li key={c.categoryName}>
                <span>{c.categoryName}</span>
                <div className="right">
                  <strong>{formatMoney(c.total)}</strong>
                  <span className="muted">{c.count} achats</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
