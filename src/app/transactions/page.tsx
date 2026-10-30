"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MonthPicker } from "@/components/MonthPicker";
import { TransactionsTable, type TxRow } from "@/components/TransactionsTable";
import { currentMonthKey } from "@/lib/money";

export default function TransactionsPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [months, setMonths] = useState<string[]>([currentMonthKey()]);
  const [q, setQ] = useState("");
  const [person, setPerson] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string }>>(
    [],
  );
  const [rows, setRows] = useState<TxRow[]>([]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ month });
    if (q.trim()) params.set("q", q.trim());
    if (person) params.set("person", person);
    if (accountId) params.set("accountId", accountId);

    const [expRes, insightRes, accRes] = await Promise.all([
      fetch(`/api/expenses?${params}`),
      fetch(`/api/insights?month=${month}`),
      fetch("/api/accounts"),
    ]);
    if (expRes.ok) {
      const json = await expRes.json();
      setRows(json.expenses);
    }
    if (insightRes.ok) {
      const json = await insightRes.json();
      setMonths(json.months?.length ? json.months : [month]);
    }
    if (accRes.ok) {
      const json = await accRes.json();
      setAccounts(json.accounts);
    }
  }, [month, q, person, accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell
      title="Transactions"
      actions={
        <>
          <MonthPicker month={month} months={months} onChange={setMonth} />
          <button type="button" className="btn ghost" onClick={() => void load()}>
            Rafraîchir
          </button>
        </>
      }
    >
      <section className="panel">
        <div className="filters" style={{ marginBottom: "1rem" }}>
          <select value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">Tout le foyer</option>
            <option value="moi">Moi</option>
            <option value="femme">Femme</option>
            <option value="fils">Fils</option>
          </select>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">Tous les comptes</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher…"
          />
        </div>
        <TransactionsTable rows={rows} />
      </section>
    </AppShell>
  );
}
