"use client";
/* eslint-disable react-hooks/set-state-in-effect -- chargement des données au montage */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConfirmDelete, api, peopleFrom } from "@/components/ui";
import { IconArrowRight, IconCheck, IconPlusCircle } from "@/components/icons";
import { colorForCategory } from "@/lib/classify";
import { formatMoney } from "@/lib/money";

type Item = {
  id: number;
  description: string;
  rawText?: string | null;
  quantity?: number | null;
  amount: number;
  category: string | null;
  subcategory: string | null;
  confidence?: number | null;
  accepted: number;
};
type Receipt = {
  id: number;
  filename: string;
  mime: string;
  status: string;
  origin?: string | null;
  error?: string | null;
  model?: string | null;
  store: string | null;
  person?: string | null;
  purchaseDate?: string | null;
  total?: number | null;
  taxes?: number | null;
  accountId?: number | null;
  items: Item[];
};
type Category = { id: number; name: string; kind: string; color?: string; subcategories: Array<{ id: number; name: string }> };
type Account = { id: number; name: string };

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "En attente", tone: "warn" },
  analyzing: { label: "Lecture en cours", tone: "warn" },
  analyzed: { label: "À vérifier", tone: "info" },
  error: { label: "Erreur de lecture", tone: "bad" },
  confirmed: { label: "Ajouté à tes dépenses", tone: "ok" },
};

export default function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ receipt: Receipt }>(`/api/receipts/${id}`);
      setReceipt(data.receipt);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ce reçu est introuvable.");
    }
  }, [id]);

  useEffect(() => {
    void load();
    void api<{ categories: Category[] }>("/api/categories").then((d) => setCategories(d.categories)).catch(() => undefined);
    void api<{ accounts: Account[] }>("/api/accounts").then((d) => setAccounts(d.accounts)).catch(() => undefined);
    void api<{ settings: Record<string, string> }>("/api/settings").then((d) => setPeople(peopleFrom(d.settings.people))).catch(() => undefined);
  }, [load]);

  const status = receipt?.status;
  useEffect(() => {
    if (status !== "pending" && status !== "analyzing") return;
    const timer = setInterval(() => void load(), 2000);
    return () => clearInterval(timer);
  }, [load, status]);

  const accepted = useMemo(() => receipt?.items.filter((i) => i.accepted !== 0) ?? [], [receipt]);
  const sum = accepted.reduce((n, i) => n + Number(i.amount || 0), 0);
  const total = receipt?.total ?? null;
  const gap = total == null ? null : Math.round((total - sum) * 100) / 100;
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of accepted) map.set(item.category || "Autres", (map.get(item.category || "Autres") ?? 0) + Number(item.amount || 0));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [accepted]);
  const locked = status === "confirmed";
  const toCheck = receipt?.items.filter((i) => i.confidence != null && i.confidence < 0.6).length ?? 0;

  async function patchReceipt(patch: Record<string, unknown>) {
    try {
      await api(`/api/receipts/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Modification non enregistrée.");
    }
  }

  async function patchItem(item: Item, patch: Record<string, unknown>) {
    // Mise à jour immédiate à l'écran, puis enregistrement.
    setReceipt((r) => (r ? { ...r, items: r.items.map((x) => (x.id === item.id ? { ...x, ...patch } : x)) } : r));
    try {
      await api(`/api/receipts/${id}/items`, { method: "PATCH", body: JSON.stringify({ itemId: item.id, ...patch }) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "La ligne n’a pas été enregistrée.");
      await load();
    }
  }

  async function addLine() {
    try {
      await api(`/api/receipts/${id}/items`, {
        method: "POST",
        body: JSON.stringify({ description: "Nouvel article", amount: 0, category: "Autres", subcategory: null }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’ajouter une ligne.");
    }
  }

  async function reanalyze() {
    setBusy(true);
    try {
      await api(`/api/receipts/${id}/reanalyze`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Relance impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    try {
      await api(`/api/receipts/${id}/confirm`, { method: "POST" });
      setJustConfirmed(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de confirmer ce reçu.");
    } finally {
      setBusy(false);
    }
  }

  if (!receipt) {
    return (
      <AppShell title="Reçu" eyebrow="Vérification">
        <div className="card rv-empty">{error || "Chargement du reçu…"}</div>
      </AppShell>
    );
  }

  const st = STATUS[receipt.status] ?? { label: receipt.status, tone: "info" };
  const fileUrl = `/api/receipts/${receipt.id}/file?f=${encodeURIComponent(receipt.filename)}`;

  return (
    <AppShell
      title={receipt.store || "Reçu sans magasin"}
      eyebrow={`Reçu #${receipt.id} · ${receipt.origin === "icloud" ? "envoyé de l’iPhone" : "ajouté sur le Mac"}`}
      actions={
        <>
          <Link className="btn-ghost" href="/recus">
            Tous les reçus
          </Link>
          {!locked && (
            <button className="btn-ghost danger" type="button" onClick={() => setDeleting(true)}>
              Supprimer
            </button>
          )}
        </>
      }
    >
      {error && <div className="banner error">{error}</div>}
      {justConfirmed && (
        <div className="banner ok rv-done">
          <IconCheck size={14} /> {accepted.length} dépenses ajoutées ({formatMoney(sum)}).
          <Link href="/transactions">Voir mes transactions</Link>
        </div>
      )}

      <div className="rv-layout">
        <section className="card rv-photo">
          <div className="card-head">
            <h2 className="card-title">Photo</h2>
            <span className={`rv-status ${st.tone}`}>{st.label}</span>
          </div>
          <button type="button" className={`rv-image ${zoom ? "zoom" : ""}`} onClick={() => setZoom((z) => !z)} aria-label={zoom ? "Réduire la photo" : "Agrandir la photo"}>
            {receipt.mime === "application/pdf" ? (
              <object data={fileUrl} type="application/pdf" aria-label="Reçu PDF" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl} alt={`Reçu ${receipt.store ?? receipt.filename}`} />
            )}
          </button>
          <p className="rv-hint">{zoom ? "Clique pour réduire." : "Clique sur la photo pour l’agrandir."}</p>
          {receipt.model && <p className="rv-hint">Lu par {receipt.model}</p>}
        </section>

        <div className="rv-main">
          <section className="card rv-head">
            <label>
              <span>Magasin</span>
              <input defaultValue={receipt.store ?? ""} disabled={locked} onBlur={(e) => e.target.value !== (receipt.store ?? "") && void patchReceipt({ store: e.target.value })} />
            </label>
            <label>
              <span>Date d’achat</span>
              <input type="date" defaultValue={receipt.purchaseDate ?? ""} disabled={locked} onChange={(e) => void patchReceipt({ purchaseDate: e.target.value || null })} />
            </label>
            <label>
              <span>Personne</span>
              <select value={receipt.person ?? ""} disabled={locked} onChange={(e) => void patchReceipt({ person: e.target.value || null })}>
                <option value="">—</option>
                {people.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Compte</span>
              <select value={receipt.accountId ?? ""} disabled={locked} onChange={(e) => void patchReceipt({ accountId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {(status === "pending" || status === "analyzing") && (
            <section className="card rv-reading">
              <span className="spinner" /> L’IA lit ton reçu… La liste s’affiche dans quelques secondes.
            </section>
          )}
          {status === "error" && (
            <section className="card rv-reading bad">
              <strong>La lecture a échoué.</strong> {receipt.error}
              <div className="scan-actions">
                <button className="btn-primary" type="button" disabled={busy} onClick={() => void reanalyze()}>
                  Relancer la lecture
                </button>
                <Link className="btn-link" href="/parametres#gemini">
                  Vérifier la clé Gemini
                </Link>
              </div>
            </section>
          )}

          <div className="rv-stats">
            <div className="card">
              <span>Total du reçu</span>
              <strong>{total == null ? "—" : formatMoney(total)}</strong>
              {receipt.taxes ? <em>dont taxes {formatMoney(receipt.taxes)}</em> : <em>&nbsp;</em>}
            </div>
            <div className="card">
              <span>Articles retenus</span>
              <strong>{formatMoney(sum)}</strong>
              <em>
                {accepted.length} sur {receipt.items.length}
              </em>
            </div>
            <div className={`card ${gap == null ? "" : Math.abs(gap) < 0.01 ? "good" : "warn"}`}>
              <span>Écart</span>
              <strong>{gap == null ? "—" : Math.abs(gap) < 0.01 ? "Aucun" : formatMoney(gap)}</strong>
              <em>{gap == null ? "Total non lu" : Math.abs(gap) < 0.01 ? "Tout correspond ✓" : "Vérifie un montant ou une ligne"}</em>
            </div>
          </div>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Articles lus</h2>
              {toCheck > 0 && <span className="rv-status warn">{toCheck} à vérifier</span>}
            </div>
            <div className="table-wrap">
              <table className="rv-table">
                <thead>
                  <tr>
                    <th aria-label="Inclure" />
                    <th>Article</th>
                    <th>Qté</th>
                    <th>Catégorie</th>
                    <th>Sous-catégorie</th>
                    <th className="num">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item) => {
                    const cat = categories.find((c) => c.name === item.category);
                    const doubt = item.confidence != null && item.confidence < 0.6;
                    return (
                      <tr key={item.id} className={`${item.accepted === 0 ? "off" : ""} ${doubt ? "doubt" : ""}`}>
                        <td>
                          <input type="checkbox" checked={item.accepted !== 0} disabled={locked} onChange={(e) => void patchItem(item, { accepted: e.target.checked })} aria-label={`Inclure ${item.description}`} />
                        </td>
                        <td>
                          <input className="rv-desc" defaultValue={item.description} disabled={locked} onBlur={(e) => e.target.value !== item.description && void patchItem(item, { description: e.target.value })} aria-label="Description" />
                          {(item.rawText && item.rawText !== item.description) || doubt ? (
                            <small>
                              {item.rawText && item.rawText !== item.description && <>Sur le reçu : {item.rawText}</>}
                              {doubt && <b> · à vérifier</b>}
                            </small>
                          ) : null}
                        </td>
                        <td className="rv-qty">{item.quantity ?? 1}</td>
                        <td>
                          <span className="rv-cat">
                            <i style={{ background: cat?.color ?? colorForCategory(item.category ?? "Autres") }} />
                            <select value={item.category ?? "Autres"} disabled={locked} onChange={(e) => void patchItem(item, { category: e.target.value, subcategory: null })} aria-label="Catégorie">
                              {categories.filter((c) => c.kind !== "income").map((c) => (
                                <option key={c.id} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </span>
                        </td>
                        <td>
                          <select value={item.subcategory ?? ""} disabled={locked} onChange={(e) => void patchItem(item, { subcategory: e.target.value || null })} aria-label="Sous-catégorie">
                            <option value="">—</option>
                            {(cat?.subcategories ?? []).map((s) => (
                              <option key={s.id} value={s.name}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="num">
                          <input className="rv-amount" type="number" step="0.01" defaultValue={item.amount} disabled={locked} onBlur={(e) => Number(e.target.value) !== item.amount && void patchItem(item, { amount: Number(e.target.value) })} aria-label="Montant" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!locked && (
              <div className="rv-foot">
                <button type="button" className="btn-ghost" onClick={() => void addLine()}>
                  <IconPlusCircle size={14} /> Ajouter une ligne
                </button>
                <button type="button" className="btn-ghost" disabled={busy} onClick={() => void reanalyze()}>
                  Relancer la lecture
                </button>
                <button type="button" className="btn-primary rv-confirm" disabled={busy || !accepted.length || status !== "analyzed"} onClick={() => void confirm()}>
                  Ajouter {accepted.length} dépense{accepted.length > 1 ? "s" : ""} · {formatMoney(sum)} <IconArrowRight size={14} />
                </button>
              </div>
            )}
          </section>

          {byCategory.length > 0 && (
            <section className="card">
              <h2 className="card-title">Ce reçu par catégorie</h2>
              <ul className="rv-split">
                {byCategory.map(([name, value]) => (
                  <li key={name}>
                    <span>
                      <i style={{ background: categories.find((c) => c.name === name)?.color ?? colorForCategory(name) }} />
                      {name}
                    </span>
                    <span className="rv-bar">
                      <b style={{ width: `${sum ? (value / sum) * 100 : 0}%`, background: categories.find((c) => c.name === name)?.color ?? colorForCategory(name) }} />
                    </span>
                    <strong>{formatMoney(value)}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {deleting && (
        <ConfirmDelete
          title="Supprimer ce reçu ?"
          detail="La photo et la liste d’articles seront effacées. Les dépenses déjà ajoutées restent."
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await api(`/api/receipts/${id}`, { method: "DELETE" });
            router.push("/recus");
          }}
        />
      )}
    </AppShell>
  );
}
