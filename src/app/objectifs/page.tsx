"use client";
/* eslint-disable react-hooks/set-state-in-effect -- chargement des données au montage */

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { formatMoney } from "@/lib/money";

type Goal = {
  id: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
};

export default function ObjectifsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");

  async function load() {
    const res = await fetch("/api/goals");
    if (res.ok) {
      const json = await res.json();
      setGoals(json.goals);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function add() {
    if (!title.trim() || !target) return;
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        targetAmount: Number(target.replace(",", ".")),
      }),
    });
    setTitle("");
    setTarget("");
    await load();
  }

  async function bump(goal: Goal, delta: number) {
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: goal.id,
        currentAmount: Math.max(0, goal.currentAmount + delta),
      }),
    });
    await load();
  }

  return (
    <AppShell title="Objectifs">
      <section className="panel" style={{ marginBottom: "1rem" }}>
        <div className="quick-row">
          <label>
            Titre
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Cible ($)
            <input value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
        </div>
        <button type="button" className="btn primary" onClick={() => void add()}>
          Créer
        </button>
      </section>

      <div className="grid charts">
        {goals.map((g) => {
          const pct =
            g.targetAmount > 0
              ? Math.min(100, (g.currentAmount / g.targetAmount) * 100)
              : 0;
          return (
            <div key={g.id} className="panel">
              <div className="panel-head">
                <h2>{g.title}</h2>
                <span className="muted">{pct.toFixed(0)}%</span>
              </div>
              <strong>
                {formatMoney(g.currentAmount)} / {formatMoney(g.targetAmount)}
              </strong>
              <div className="sub-bars-track" style={{ marginTop: "0.75rem" }}>
                <span style={{ width: `${pct}%`, background: "#7c5cff" }} />
              </div>
              {g.deadline && (
                <p className="muted small">Échéance {g.deadline}</p>
              )}
              <div className="filters" style={{ marginTop: "0.75rem" }}>
                <button type="button" className="btn ghost" onClick={() => void bump(g, 50)}>
                  +50 $
                </button>
                <button type="button" className="btn ghost" onClick={() => void bump(g, 200)}>
                  +200 $
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
