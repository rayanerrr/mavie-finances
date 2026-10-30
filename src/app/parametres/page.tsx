"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Notice } from "@/components/ui";

export default function ParametresPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [people, setPeople] = useState("moi, femme, fils");
  const [householdName, setHouseholdName] = useState("Foyer");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [inboxDir, setInboxDir] = useState("");
  const [inboxEnabled, setInboxEnabled] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const json = await res.json();
        setSettings(json.settings);
        setHouseholdName(json.settings.householdName ?? "Foyer");
        setInboxDir(json.settings.inboxDir ?? "");
        setInboxEnabled(json.settings.inboxEnabled !== "false");
        try {
          const parsed = JSON.parse(json.settings.people ?? "[]");
          if (Array.isArray(parsed)) setPeople(parsed.join(", "));
        } catch {
          /* ignore */
        }
      } else setError(res.status === 404 ? "Les paramètres ne sont pas disponibles. Vérifie la configuration du foyer." : "Impossible de charger tes paramètres.");
    })();
  }, []);

  async function save() {
    const peopleArr = people
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const responses = await Promise.all([
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
      ...(geminiKey ? [fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "geminiApiKey", value: geminiKey }) })] : []),
      fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "inboxDir", value: inboxDir }) }),
      fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "inboxEnabled", value: String(inboxEnabled) }) }),
    ]);
    if (responses.some((response) => !response.ok)) { setError("Un réglage n’a pas pu être enregistré."); return; }
    setMsg("Paramètres enregistrés.");
  }

  async function testGemini() { const res = await fetch("/api/settings/test-gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(geminiKey ? { key: geminiKey } : {}) }); setMsg(res.ok ? "Gemini répond correctement." : "La clé Gemini est refusée. Colle une nouvelle clé."); }

  return (
    <AppShell title="Paramètres">
      {error && <Notice error={error} />}
      <section className="card settings-section"><div><h2 className="card-title">Gemini</h2><p>Ta clé sert seulement à lire les reçus. Elle reste sur ton Mac.</p><a className="link" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Obtenir une clé Gemini</a></div><div className="quick-form"><label>Clé API<input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder={settings.geminiKeyHint ? `Clé enregistrée ${settings.geminiKeyHint}` : "AIza…"} /></label><div className="actions"><button type="button" className="btn-primary" onClick={() => void save()}>Enregistrer</button><button type="button" className="btn-ghost" onClick={() => void testGemini()}>Tester la connexion</button></div></div></section>
      <section className="card settings-section"><div><h2 className="card-title">iPhone et iCloud</h2><p>Prends une photo dans l’app iPhone. Le Mac la lit dans iCloud et l’ajoute à tes reçus.</p></div><div className="quick-form"><label className="checkbox-label"><input type="checkbox" checked={inboxEnabled} onChange={e => setInboxEnabled(e.target.checked)} />Surveiller le dossier automatiquement</label><label>Chemin iCloud<input value={inboxDir} onChange={e => setInboxDir(e.target.value)} placeholder="~/Library/Mobile Documents/…/MaVie" /></label><ol><li>Active iCloud Drive.</li><li>Choisis MaVie dans l’app iPhone.</li><li>Vérifie le reçu ici avant de le confirmer.</li></ol></div></section>
      <section className="card settings-section">
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
          <button type="button" className="btn-primary" onClick={() => void save()}>
            Enregistrer
          </button>
          {msg && <p className="muted">{msg}</p>}
        </div>
      </section>
    </AppShell>
  );
}
