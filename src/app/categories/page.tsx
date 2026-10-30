"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type Cat = {
  id: number;
  name: string;
  color: string;
  kind: string;
  subcategories: Array<{ id: number; name: string }>;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("essential");

  async function load() {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const json = await res.json();
      setCategories(json.categories);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function addCategory() {
    if (!name.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind }),
    });
    setName("");
    await load();
  }

  return (
    <AppShell title="Catégories">
      <section className="panel" style={{ marginBottom: "1rem" }}>
        <div className="quick-row">
          <label>
            Nouvelle catégorie
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="essential">Essentielle</option>
              <option value="discretionary">Discrétionnaire</option>
              <option value="income">Revenu</option>
            </select>
          </label>
        </div>
        <button type="button" className="btn primary" onClick={() => void addCategory()}>
          Ajouter
        </button>
      </section>

      <div className="cat-grid">
        {categories.map((cat) => (
          <div key={cat.id} className="cat-card static">
            <i style={{ background: cat.color }} />
            <div>
              <strong>{cat.name}</strong>
              <span>
                {cat.kind} · {cat.subcategories.length} sous-cat.
              </span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
