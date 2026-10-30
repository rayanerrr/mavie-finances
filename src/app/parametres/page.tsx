"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

export default function ParametresPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [people, setPeople] = useState("moi, femme, fils");
  const [householdName, setHouseholdName] = useState("Foyer");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const json = await res.json();
        setSettings(json.settings);
        setHouseholdName(json.settings.householdName ?? "Foyer");
        try {
          const parsed = JSON.parse(json.settings.people ?? "[]");
          if (Array.isArray(parsed)) setPeople(parsed.join(", "));
        } catch {
          /* ignore */
        }
      }
    })();
  }, []);

  async function save() {
    const peopleArr = people
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    await Promise.all([
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "householdName", value: householdName }),
      }),
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "people",
          value: JSON.stringify(peopleArr),
        }),
      }),
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "currency", value: "CAD" }),
      }),
    ]);
    setMsg("Paramètres enregistrés.");
  }

  return (
    <AppShell title="Paramètres">
      <section className="panel">
        <div className="quick-form">
          <label>
            Nom du foyer
            <input
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
            />
          </label>
          <label>
            Personnes (séparées par des virgules)
            <input value={people} onChange={(e) => setPeople(e.target.value)} />
          </label>
          <label>
            Devise
            <input value={settings.currency ?? "CAD"} disabled />
          </label>
          <button type="button" className="btn primary" onClick={() => void save()}>
            Enregistrer
          </button>
          {msg && <p className="muted">{msg}</p>}
        </div>
      </section>
    </AppShell>
  );
}
