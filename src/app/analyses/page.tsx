"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DonutChart, EvolutionChart } from "@/components/charts";
import { MonthPicker } from "@/components/MonthPicker";
import { currentMonthKey, formatMoney } from "@/lib/money";

export default function AnalysesPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [data, setData] = useState<{
    months: string[];
    total: number;
    byCategory: Array<{ categoryName: string; total: number; color: string }>;
    insights: {
      evolution: {
        categoryNames: string[];
        series: Array<{
          monthKey: string;
          total: number;
          byCategory: Array<{ category: string; total: number; color: string }>;
        }>;
      };
      rising: Array<{ category: string; delta: number; pct: number | null }>;
    };
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/insights?month=${month}`);
      if (res.ok) setData(await res.json());
    })();
  }, [month]);

  return (
    <AppShell
      title="Analyses"
      actions={
        <MonthPicker
          month={month}
          months={data?.months ?? [month]}
          onChange={setMonth}
        />
      }
    >
      {data && (
        <>
          <section className="grid charts">
            <div className="panel">
              <h2>Répartition</h2>
              <DonutChart
                slices={data.byCategory.map((c) => ({
                  label: c.categoryName,
                  value: c.total,
                  color: c.color,
                }))}
                centerLabel="Total"
                centerValue={formatMoney(data.total)}
              />
            </div>
            <div className="panel">
              <h2>Tendance 6 mois</h2>
              <EvolutionChart
                series={data.insights.evolution.series}
                categoryNames={data.insights.evolution.categoryNames}
              />
            </div>
          </section>
          <section className="panel">
            <h2>Catégories en hausse</h2>
            <ul className="list">
              {data.insights.rising.map((r) => (
                <li key={r.category}>
                  <span>{r.category}</span>
                  <div className="right">
                    <strong className="up">+{formatMoney(r.delta)}</strong>
                    {r.pct != null && (
                      <span className="muted">{r.pct.toFixed(0)}%</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </AppShell>
  );
}
