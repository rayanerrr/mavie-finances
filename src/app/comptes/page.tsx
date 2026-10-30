"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { formatMoney } from "@/lib/money";

type Account = {
  id: number;
  name: string;
  type: string;
  color: string;
  balance: number;
  incomeTotal: number;
  expenseTotal: number;
};

export default function ComptesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("carte");

  async function load() {
    const res = await fetch("/api/accounts");
    if (res.ok) {
      const json = await res.json();
      setAccounts(json.accounts);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function add() {
    if (!name.trim()) return;
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    setName("");
    await load();
  }

  return (
    <AppShell title="Comptes">
      <section className="panel" style={{ marginBottom: "1rem" }}>
        <div className="quick-row">
          <label>
            Nom
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="carte">Carte</option>
              <option value="cheque">Chèque</option>
              <option value="especes">Espèces</option>
            </select>
          </label>
        </div>
        <button type="button" className="btn primary" onClick={() => void add()}>
          Ajouter un compte
        </button>
      </section>

      <div className="kpi-row">
        {accounts.map((a) => (
          <article key={a.id} className="kpi">
            <span style={{ color: a.color }}>{a.type}</span>
            <strong>{a.name}</strong>
            <em className={a.balance >= 0 ? "down" : "up"}>
              Solde {formatMoney(a.balance)}
            </em>
            <span className="muted small">
              +{formatMoney(a.incomeTotal)} / -{formatMoney(a.expenseTotal)}
            </span>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
