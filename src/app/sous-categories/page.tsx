"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type Cat = {
  id: number;
  name: string;
  color: string;
  subcategories: Array<{ id: number; name: string }>;
};

export default function SousCategoriesPage() {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [name, setName] = useState("");

  async function load() {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const json = await res.json();
      setCategories(json.categories);
      if (!categoryId && json.categories[0]) setCategoryId(json.categories[0].id);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addSub() {
    if (!categoryId || !name.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, subcategory: name }),
    });
    setName("");
    await load();
  }

  return (
    <AppShell title="Sous-catégories">
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
            Nouvelle sous-catégorie
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>
        <button type="button" className="btn primary" onClick={() => void addSub()}>
          Ajouter
        </button>
      </section>

      <div className="grid charts">
        {categories.map((cat) => (
          <div key={cat.id} className="panel">
            <div className="panel-head">
              <h2>{cat.name}</h2>
              <i
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 99,
                  background: cat.color,
                  display: "inline-block",
                }}
              />
            </div>
            <ul className="list compact">
              {cat.subcategories.map((sub) => (
                <li key={sub.id}>
                  <span>{sub.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
