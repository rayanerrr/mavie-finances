"use client";
/* eslint-disable react-hooks/set-state-in-effect -- chargement des données au montage */

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MonthPicker } from "@/components/MonthPicker";
import { TransactionsTable, type TxRow } from "@/components/TransactionsTable";
import { ConfirmDelete, Notice, useChoices, type Category } from "@/components/ui";
import { currentMonthKey, formatMoney } from "@/lib/money";

export default function TransactionsPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [months, setMonths] = useState<string[]>([currentMonthKey()]);
  const [q, setQ] = useState("");
  const [person, setPerson] = useState("");
  const [accountId, setAccountId] = useState("");
  const [source, setSource] = useState("");
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string }>>(
    [],
  );
  const [rows, setRows] = useState<TxRow[]>([]);
  const [selected, setSelected] = useState<TxRow | null>(null);
  const [deleting, setDeleting] = useState<TxRow | null>(null);
  const [error, setError] = useState("");
  const { categories, people } = useChoices();

  const load = useCallback(async () => {
    const params = new URLSearchParams({ month });
    if (q.trim()) params.set("q", q.trim());
    if (person) params.set("person", person);
    if (accountId) params.set("accountId", accountId);
    if (source) params.set("source", source);

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
  }, [month, q, person, accountId, source]);

  async function save(form: EditForm) {
    if (!selected) return;
    const response = await fetch(`/api/expenses/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount: Number(form.amount.replace(",", ".")), accountId: form.accountId ? Number(form.accountId) : null, subcategory: form.subcategory || null }) });
    if (!response.ok) { setError("Impossible d’enregistrer la transaction."); return; }
    setSelected(null);
    await load();
  }

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
      {error && <Notice error={error} />}
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
          <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source"><option value="">Toutes les sources</option><option value="receipt">Reçu</option><option value="text">Manuel</option><option value="recurring">Fixe</option></select>
        </div>
        <TransactionsTable rows={rows} onSelect={setSelected} />
      </section>
      {selected && <EditDialog row={selected} categories={categories} accounts={accounts} people={people} onClose={() => setSelected(null)} onSave={save} onDelete={() => { setDeleting(selected); setSelected(null); }} />}
      {deleting && <ConfirmDelete title="Supprimer cette transaction ?" detail={`« ${deleting.description} » sera supprimée définitivement.`} onClose={() => setDeleting(null)} onConfirm={async () => { const response = await fetch(`/api/expenses/${deleting.id}`, { method: "DELETE" }); if (!response.ok) throw new Error("Suppression impossible."); setDeleting(null); await load(); }} />}
    </AppShell>
  );
}

type EditForm = { date: string; amount: string; description: string; store: string; person: string; category: string; subcategory: string; accountId: string; notes: string };
function EditDialog({ row, categories, accounts, people, onClose, onSave, onDelete }: { row: TxRow; categories: Category[]; accounts: Array<{ id: number; name: string }>; people: string[]; onClose: () => void; onSave: (form: EditForm) => Promise<void>; onDelete: () => void }) {
  const [form, setForm] = useState<EditForm>({ date: row.date, amount: String(row.amount), description: row.description, store: row.store ?? "", person: row.person ?? "", category: row.categoryName ?? "Autres", subcategory: row.subcategoryName ?? "", accountId: row.accountId ? String(row.accountId) : "", notes: row.notes ?? "" });
  const category = categories.find((item) => item.name === form.category);
  const set = (key: keyof EditForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="drawer-backdrop"><aside className="edit-drawer" aria-label="Modifier la transaction"><div className="panel-head"><h2>Modifier la transaction</h2><button className="btn" onClick={onClose}>Fermer</button></div><div className="quick-form"><label>Date<input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></label><label>Montant<input inputMode="decimal" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></label><label>Description<input value={form.description} onChange={(e) => set("description", e.target.value)} /></label><label>Marchand<input value={form.store} onChange={(e) => set("store", e.target.value)} /></label><label>Personne<select value={form.person} onChange={(e) => set("person", e.target.value)}><option value="">Non précisée</option>{people.map((item) => <option key={item}>{item}</option>)}</select></label><label>Compte<select value={form.accountId} onChange={(e) => set("accountId", e.target.value)}><option value="">Non précisé</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Catégorie<select value={form.category} onChange={(e) => { set("category", e.target.value); set("subcategory", ""); }}>{categories.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label>Sous-catégorie<select value={form.subcategory} onChange={(e) => set("subcategory", e.target.value)} disabled={!category}><option value="">Aucune</option>{category?.subcategories.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label className="full">Notes<textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></label></div><div className="actions"><button className="btn primary" onClick={() => void onSave(form)}>Enregistrer</button><button className="btn danger" onClick={onDelete}>Supprimer</button></div></aside></div>;
}
