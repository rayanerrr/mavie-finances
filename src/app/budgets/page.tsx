"use client";
/* eslint-disable react-hooks/set-state-in-effect -- chargement des données au montage */

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MonthPicker } from "@/components/MonthPicker";
import { currentMonthKey, formatMoney } from "@/lib/money";

type Budget = {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  amount: number;
  actual: number;
  remaining: number;
  pct: number;
};

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    const [bRes, cRes] = await Promise.all([
      fetch(`/api/budgets?month=${month}`),
      fetch("/api/categories"),
    ]);
    if (bRes.ok) {
      const json = await bRes.json();
      setBudgets(json.budgets);
    }
    if (cRes.ok) {
      const json = await cRes.json();
      setCategories(json.categories);
      if (!categoryId && json.categories[0]) setCategoryId(json.categories[0].id);
    }
  }, [month, categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!categoryId || !amount) return;
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        monthKey: month,
        amount: Number(amount.replace(",", ".")),
      }),
    });
    setAmount("");
    await load();
  }

  return (
    <AppShell
      title="Budgets"
      actions={<MonthPicker month={month} months={[month]} onChange={setMonth} />}
    >
      <section className="panel" style={{ marginBottom: "1rem" }}>
        <div className="quick-row">
          <label>
            Catégorie
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Montant mensuel
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
        </div>
        <button type="button" className="btn primary" onClick={() => void save()}>
          Enregistrer
        </button>
      </section>

      <div className="side-stack">
        {budgets.map((b) => (
          <div key={b.id} className="panel">
            <div className="panel-head">
              <h2>{b.categoryName}</h2>
              <span className="muted">
                {formatMoney(b.actual)} / {formatMoney(b.amount)}
              </span>
            </div>
            <div className="sub-bars-track">
              <span
                style={{
                  width: `${Math.min(b.pct, 100)}%`,
                  background: b.pct > 100 ? "#fb7185" : b.categoryColor,
                }}
              />
            </div>
            <p className="muted small" style={{ marginTop: "0.6rem" }}>
              {b.remaining >= 0
                ? `Reste ${formatMoney(b.remaining)}`
                : `Dépassement ${formatMoney(Math.abs(b.remaining))}`}
            </p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
