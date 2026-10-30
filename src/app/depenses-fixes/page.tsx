"use client";
/* eslint-disable react-hooks/set-state-in-effect -- chargement des données au montage */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CategoryChip } from "@/components/CategoryChip";
import { MonthRail } from "@/components/FinanceWidgets";
import { ConfirmDelete, Dialog, api, peopleFrom } from "@/components/ui";
import { IconCalendar, IconCard, IconPie, IconPlusCircle, IconTrendUp } from "@/components/icons";
import { colorForCategory } from "@/lib/classify";
import { currentMonthKey, formatMoney, monthTitle, nextMonthKey, previousMonthKey } from "@/lib/money";

type Fixed = {
  id: number;
  name: string;
  amount: number;
  type: "expense" | "income";
  categoryName?: string | null;
  categoryColor?: string | null;
  subcategoryName?: string | null;
  accountId?: number | null;
  accountName?: string | null;
  person?: string | null;
  store?: string | null;
  frequency: "monthly" | "weekly" | "biweekly" | "yearly";
  dayOfMonth?: number | null;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
  nextDate?: string | null;
  monthlyEquivalent: number;
  active: boolean;
};
type Upcoming = { recurringId: number; name: string; amount: number; type: string; date: string; categoryName?: string; categoryColor?: string; status: "paid" | "upcoming" };
type Category = { id: number; name: string; kind: string; color?: string; subcategories: Array<{ id: number; name: string }> };
type Account = { id: number; name: string };

type Draft = {
  id?: number;
  name: string;
  amount: string;
  type: "expense" | "income";
  category: string;
  subcategory: string;
  frequency: Fixed["frequency"];
  dayOfMonth: string;
  startDate: string;
  endDate: string;
  accountId: string;
  person: string;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: Draft = {
  name: "",
  amount: "",
  type: "expense",
  category: "Factures & Services",
  subcategory: "",
  frequency: "monthly",
  dayOfMonth: "1",
  startDate: today(),
  endDate: "",
  accountId: "",
  person: "",
  notes: "",
};

// Raccourcis : un clic pré-remplit le formulaire.
const SUGGESTIONS: Array<Partial<Draft> & { name: string }> = [
  { name: "Loyer", category: "Logement", subcategory: "Loyer", dayOfMonth: "1" },
  { name: "Hydro-Québec", category: "Factures & Services", subcategory: "Électricité" },
  { name: "Internet", category: "Factures & Services", subcategory: "Internet" },
  { name: "Cellulaire", category: "Factures & Services", subcategory: "Téléphone" },
  { name: "Assurance auto", category: "Factures & Services", subcategory: "Assurances" },
  { name: "Assurance habitation", category: "Factures & Services", subcategory: "Assurances" },
  { name: "Netflix", category: "Divertissement", subcategory: "Streaming" },
  { name: "Spotify", category: "Divertissement", subcategory: "Musique" },
  { name: "Gym", category: "Santé & Fitness", subcategory: "Gym" },
  { name: "Salaire", type: "income", category: "Revenu", subcategory: "Salaire", frequency: "biweekly" },
];

const FREQ_LABEL: Record<Fixed["frequency"], string> = {
  monthly: "Chaque mois",
  weekly: "Chaque semaine",
  biweekly: "Aux deux semaines",
  yearly: "Chaque année",
};

function niceDate(date?: string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
}

function rhythm(item: Fixed) {
  if (item.frequency === "monthly") return item.dayOfMonth === 1 ? "Le 1er de chaque mois" : `Le ${item.dayOfMonth ?? Number(item.startDate.slice(8))} de chaque mois`;
  if (item.frequency === "yearly") return `Chaque année, le ${niceDate(item.startDate)}`;
  return FREQ_LABEL[item.frequency];
}

export default function DepensesFixesPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [items, setItems] = useState<Fixed[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Fixed | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, next] = await Promise.all([
        api<{ items: Fixed[] }>("/api/recurring"),
        api<{ items: Upcoming[] }>(`/api/recurring/upcoming?month=${month}`),
      ]);
      setItems(list.items);
      setUpcoming(next.items);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Les dépenses fixes ne sont pas disponibles.");
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void api<{ categories: Category[] }>("/api/categories").then((d) => setCategories(d.categories)).catch(() => undefined);
    void api<{ accounts: Account[] }>("/api/accounts").then((d) => setAccounts(d.accounts)).catch(() => undefined);
    void api<{ settings: Record<string, string> }>("/api/settings").then((d) => setPeople(peopleFrom(d.settings.people))).catch(() => undefined);
  }, []);

  const active = items.filter((i) => i.active);
  const monthlyOut = active.filter((i) => i.type === "expense").reduce((n, i) => n + i.monthlyEquivalent, 0);
  const monthlyIn = active.filter((i) => i.type === "income").reduce((n, i) => n + i.monthlyEquivalent, 0);
  const share = monthlyIn ? (monthlyOut / monthlyIn) * 100 : null;
  const paid = upcoming.filter((u) => u.type === "expense" && u.status === "paid").reduce((n, u) => n + u.amount, 0);
  const toCome = upcoming.filter((u) => u.type === "expense" && u.status === "upcoming").reduce((n, u) => n + u.amount, 0);

  const groups = useMemo(() => {
    const map = new Map<string, Fixed[]>();
    for (const item of items) {
      const key = item.type === "income" ? "Revenus" : item.categoryName || "Autres";
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()].sort((a, b) => (a[0] === "Revenus" ? 1 : b[0] === "Revenus" ? -1 : a[0].localeCompare(b[0], "fr")));
  }, [items]);

  function openNew(preset?: Partial<Draft>) {
    setDraft({ ...EMPTY, startDate: today(), person: people[0] ?? "", ...preset });
  }

  function openEdit(item: Fixed) {
    setDraft({
      id: item.id,
      name: item.name,
      amount: String(item.amount),
      type: item.type,
      category: item.categoryName ?? "Autres",
      subcategory: item.subcategoryName ?? "",
      frequency: item.frequency,
      dayOfMonth: String(item.dayOfMonth ?? Number(item.startDate.slice(8))),
      startDate: item.startDate,
      endDate: item.endDate ?? "",
      accountId: item.accountId ? String(item.accountId) : "",
      person: item.person ?? "",
      notes: item.notes ?? "",
    });
  }

  async function save() {
    if (!draft) return;
    const amount = Number(draft.amount.replace(",", "."));
    if (!draft.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Donne un nom et un montant plus grand que 0.");
      return;
    }
    setSaving(true);
    const body = {
      name: draft.name.trim(),
      amount,
      type: draft.type,
      category: draft.category,
      subcategory: draft.subcategory || null,
      frequency: draft.frequency,
      dayOfMonth: draft.frequency === "monthly" ? Number(draft.dayOfMonth) || 1 : null,
      startDate: draft.startDate,
      endDate: draft.endDate || null,
      accountId: draft.accountId ? Number(draft.accountId) : null,
      person: draft.person || null,
      notes: draft.notes || null,
    };
    try {
      await api(draft.id ? `/api/recurring/${draft.id}` : "/api/recurring", {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: Fixed) {
    try {
      await api(`/api/recurring/${item.id}`, { method: "PATCH", body: JSON.stringify({ active: !item.active }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Modification impossible.");
    }
  }

  const draftCategory = categories.find((c) => c.name === draft?.category);
  const draftCategories = categories.filter((c) => (draft?.type === "income" ? c.kind === "income" : c.kind !== "income"));

  return (
    <AppShell
      title="Dépenses fixes"
      eyebrow="Loyer, factures, abonnements et salaire : saisis une fois, ajoutés tout seuls"
      actions={
        <button className="btn-primary" type="button" onClick={() => openNew()}>
          <IconPlusCircle size={15} /> Ajouter une dépense fixe
        </button>
      }
    >
      {error && <div className="banner error">{error}</div>}

      <section className="kpis">
        <article className="card kpi">
          <span className="kpi-icon red">
            <IconCard size={18} />
          </span>
          <div>
            <span className="kpi-label">Fixes par mois</span>
            <strong className="kpi-value">{formatMoney(monthlyOut)}</strong>
            <span className="kpi-sub">{active.filter((i) => i.type === "expense").length} prélèvements actifs</span>
          </div>
        </article>
        <article className="card kpi">
          <span className="kpi-icon green">
            <IconTrendUp size={18} />
          </span>
          <div>
            <span className="kpi-label">Revenus fixes par mois</span>
            <strong className="kpi-value pos">+{formatMoney(monthlyIn)}</strong>
            <span className="kpi-sub">Moyenne sur l’année</span>
          </div>
        </article>
        <article className="card kpi">
          <span className="kpi-icon purple">
            <IconPie size={18} />
          </span>
          <div>
            <span className="kpi-label">Part de tes revenus</span>
            <strong className="kpi-value">{share == null ? "—" : `${share.toFixed(0)} %`}</strong>
            <span className="kpi-sub">{share == null ? "Ajoute ton salaire pour la calculer" : share > 60 ? "Élevée : peu de marge" : "Il te reste de la marge"}</span>
          </div>
        </article>
        <article className="card kpi">
          <span className="kpi-icon blue">
            <IconCalendar size={18} />
          </span>
          <div>
            <span className="kpi-label">{monthTitle(month)}</span>
            <strong className="kpi-value">{formatMoney(toCome)}</strong>
            <span className="kpi-sub">encore à venir · {formatMoney(paid)} déjà payés</span>
          </div>
        </article>
      </section>

      <section className="card fx-month">
        <div className="card-head">
          <h2 className="card-title">Calendrier du mois</h2>
          <div className="fx-monthpick">
            <button type="button" className="btn-ghost" onClick={() => setMonth(previousMonthKey(month))} aria-label="Mois précédent">
              ‹
            </button>
            <span>{monthTitle(month)}</span>
            <button type="button" className="btn-ghost" onClick={() => setMonth(nextMonthKey(month))} aria-label="Mois suivant">
              ›
            </button>
          </div>
        </div>
        <MonthRail month={month} items={upcoming} />
        {upcoming.length ? (
          <ul className="fx-agenda">
            {upcoming.map((u) => (
              <li key={`${u.recurringId}-${u.date}`} className={u.status}>
                <span className="fx-day">
                  <b>{Number(u.date.slice(8))}</b>
                  {new Intl.DateTimeFormat("fr-CA", { month: "short" }).format(new Date(`${u.date}T12:00:00`))}
                </span>
                <span className="fx-dot" style={{ background: u.categoryColor ?? colorForCategory(u.categoryName ?? "Autres") }} />
                <span className="fx-name">{u.name}</span>
                <span className={`fx-amount ${u.type === "income" ? "pos" : ""}`}>
                  {u.type === "income" ? "+" : "−"}
                  {formatMoney(u.amount)}
                </span>
                <span className={`fx-state ${u.status}`}>{u.status === "paid" ? "Payé" : "À venir"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fx-empty">Rien de prévu ce mois-ci.</p>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Tes dépenses fixes</h2>
          <span className="muted small">{items.length} au total</span>
        </div>
        {items.length === 0 ? (
          <div className="fx-start">
            <p>Commence par ce qui revient chaque mois. Un clic pré-remplit le formulaire :</p>
          </div>
        ) : (
          groups.map(([group, list]) => (
            <div className="fx-group" key={group}>
              <h3>{group}</h3>
              <ul>
                {list.map((item) => (
                  <li key={item.id} className={item.active ? "" : "paused"}>
                    <CategoryChip name={item.type === "income" ? "Revenu" : item.categoryName ?? "Autres"} color={item.categoryColor ?? null} />
                    <div className="fx-main">
                      <strong>{item.name}</strong>
                      <span>
                        {rhythm(item)}
                        {item.subcategoryName ? ` · ${item.subcategoryName}` : ""}
                        {item.accountName ? ` · ${item.accountName}` : ""}
                        {item.person ? ` · ${item.person}` : ""}
                      </span>
                    </div>
                    <div className="fx-next">
                      <span>{item.active ? "Prochaine fois" : "En pause"}</span>
                      <strong>{item.active ? niceDate(item.nextDate) : "—"}</strong>
                    </div>
                    <strong className={`fx-value ${item.type === "income" ? "pos" : ""}`}>
                      {item.type === "income" ? "+" : ""}
                      {formatMoney(item.amount)}
                    </strong>
                    <div className="fx-actions">
                      <button type="button" className="btn-ghost" onClick={() => void toggle(item)}>
                        {item.active ? "Pause" : "Reprendre"}
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => openEdit(item)}>
                        Modifier
                      </button>
                      <button type="button" className="btn-ghost danger" onClick={() => setDeleting(item)} aria-label={`Supprimer ${item.name}`}>
                        Supprimer
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        <div className="fx-suggest">
          <span>Ajout rapide :</span>
          {SUGGESTIONS.filter((s) => !items.some((i) => i.name.toLowerCase() === s.name.toLowerCase())).map((s) => (
            <button key={s.name} type="button" className="chip" onClick={() => openNew(s)}>
              + {s.name}
            </button>
          ))}
        </div>
      </section>

      {draft && (
        <Dialog title={draft.id ? `Modifier « ${draft.name} »` : "Nouvelle dépense fixe"} onClose={() => setDraft(null)} drawer>
          <div className="fx-form">
            <div className="segmented" role="group" aria-label="Type">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={draft.type === t ? "active" : ""}
                  onClick={() => setDraft({ ...draft, type: t, category: t === "income" ? "Revenu" : "Factures & Services", subcategory: "" })}
                >
                  {t === "expense" ? "Dépense" : "Revenu"}
                </button>
              ))}
            </div>
            <label>
              <span>Nom</span>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="ex. Loyer" autoFocus />
            </label>
            <label>
              <span>Montant</span>
              <input value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} inputMode="decimal" placeholder="0,00 $" />
            </label>
            <div className="fx-2">
              <label>
                <span>Catégorie</span>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value, subcategory: "" })}>
                  {draftCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Sous-catégorie</span>
                <select value={draft.subcategory} onChange={(e) => setDraft({ ...draft, subcategory: e.target.value })}>
                  <option value="">—</option>
                  {(draftCategory?.subcategories ?? []).map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="fx-2">
              <label>
                <span>Fréquence</span>
                <select value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value as Fixed["frequency"] })}>
                  {Object.entries(FREQ_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              {draft.frequency === "monthly" ? (
                <label>
                  <span>Jour du mois</span>
                  <select value={draft.dayOfMonth} onChange={(e) => setDraft({ ...draft, dayOfMonth: e.target.value })}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d === 1 ? "1er" : d}
                        {d >= 29 ? " (ou dernier jour)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  <span>{draft.frequency === "yearly" ? "Date chaque année" : "Premier versement"}</span>
                  <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
                </label>
              )}
            </div>
            <div className="fx-2">
              {draft.frequency === "monthly" && (
                <label>
                  <span>À partir du</span>
                  <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
                </label>
              )}
              <label>
                <span>Jusqu’au (facultatif)</span>
                <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
              </label>
            </div>
            <div className="fx-2">
              <label>
                <span>Compte</span>
                <select value={draft.accountId} onChange={(e) => setDraft({ ...draft, accountId: e.target.value })}>
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Personne</span>
                <select value={draft.person} onChange={(e) => setDraft({ ...draft, person: e.target.value })}>
                  <option value="">—</option>
                  {people.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>Note</span>
              <input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="facultatif" />
            </label>
            <p className="fx-help">
              Les échéances déjà passées depuis la date de début sont ajoutées tout de suite à tes transactions, puis chaque nouvelle échéance s’ajoute toute seule.
            </p>
            <div className="fx-form-foot">
              <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>
                Annuler
              </button>
              <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
                {draft.id ? "Enregistrer" : "Ajouter"}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {deleting && (
        <ConfirmDelete
          title={`Supprimer « ${deleting.name} » ?`}
          detail="Elle ne s’ajoutera plus. Les dépenses déjà créées restent dans tes transactions."
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api(`/api/recurring/${deleting.id}`, { method: "DELETE" });
            setDeleting(null);
            await load();
          }}
        />
      )}
    </AppShell>
  );
}
