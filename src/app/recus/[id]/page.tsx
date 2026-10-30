"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { api } from "@/components/ui";
import { SoftError } from "@/components/FinanceWidgets";
import { formatMoney } from "@/lib/money";

type Item = { id: number; description: string; rawText?: string | null; quantity?: number | null; amount: number; category: string | null; subcategory: string | null; confidence?: number | null; accepted: number };
type Receipt = { id: number; filename: string; mime: string; status: string; store: string | null; person?: string | null; purchaseDate?: string | null; total?: number | null; items: Item[]; itemsSum?: number; difference?: number | null; accountId?: number | null };
type Category = { id: number; name: string; kind: string; subcategories: Array<{ id: number; name: string }> };

export default function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const [receipt, setReceipt] = useState<Receipt | null>(null); const [categories, setCategories] = useState<Category[]>([]); const [error, setError] = useState(""); const [saved, setSaved] = useState(""); const [zoom, setZoom] = useState(false); const [stamp, setStamp] = useState(false);
  const load = useCallback(async () => { try { const data = await api<{ receipt: Receipt }>(`/api/receipts/${id}`); setReceipt(data.receipt); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Ce reçu est introuvable."); } }, [id]);
  useEffect(() => { void load(); void api<{ categories: Category[] }>("/api/categories").then(data => setCategories(data.categories)).catch(() => setError("Les catégories n’ont pas pu être chargées.")); }, [load]);
  const receiptStatus = receipt?.status;
  useEffect(() => { if (!receiptStatus || !["pending", "analyzing"].includes(receiptStatus)) return; const timer = setInterval(() => void load(), 2000); return () => clearInterval(timer); }, [load, receiptStatus]);
  const sum = useMemo(() => receipt?.items.filter(i => i.accepted !== 0).reduce((n, i) => n + Number(i.amount || 0), 0) ?? 0, [receipt]);
  async function patchItem(item: Item, key: string, value: unknown) { try { await api(`/api/receipts/${id}/items`, { method: "PATCH", body: JSON.stringify({ itemId: item.id, [key]: value }) }); await load(); setSaved("Ligne enregistrée"); } catch (e) { setError(e instanceof Error ? e.message : "La ligne n’a pas été enregistrée."); } }
  async function patchCategory(item: Item, category: string) { try { await api(`/api/receipts/${id}/items`, { method: "PATCH", body: JSON.stringify({ itemId: item.id, category, subcategory: null }) }); await load(); setSaved("Ligne enregistrée"); } catch (e) { setError(e instanceof Error ? e.message : "La catégorie n’a pas été enregistrée."); } }
  function categoryFor(item: Item) { return categories.find(category => category.name === item.category); }
  async function confirm() { try { await api(`/api/receipts/${id}/confirm`, { method: "POST" }); setStamp(true); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Impossible de confirmer ce reçu."); } }
  if (error && !receipt) return <AppShell title="Reçu"><SoftError message={`${error} La route de lecture répond peut-être 404.`} /></AppShell>;
  if (!receipt) return <AppShell title="Reçu"><p className="loading">Lecture du reçu…</p></AppShell>;
  return <AppShell title={receipt.store || `Reçu #${receipt.id}`} eyebrow={`${receipt.purchaseDate || "Date à confirmer"} · ${receipt.filename}`} actions={<Link className="btn" href="/recus">Tous les reçus</Link>}>
    {error && <SoftError message={error} />}{saved && <div className="notice" role="status">{saved}</div>}
    <div className="receipt-workbench">
      <div className={`receipt-preview ${zoom ? "zoomed" : ""}`}>
        {receipt.mime === "application/pdf" ? <object data={`/api/receipts/${id}/file`} type="application/pdf" aria-label="PDF du reçu"><p>Le PDF ne peut pas être affiché. <a href={`/api/receipts/${id}/file`}>Ouvrir le fichier</a>.</p></object> : <button className="btn ghost" onClick={() => setZoom(!zoom)} aria-label="Zoomer la photo"><img className="zoomable" src={`/api/receipts/${id}/file`} alt={`Photo du reçu ${receipt.filename}`} /></button>}
      </div>
      <section className="receipt-strip" aria-label="Bande de reçu éditable">
        <header><p>MA VIE · REÇU #{receipt.id}</p><label>Magasin<input value={receipt.store ?? ""} onChange={e => setReceipt({ ...receipt, store: e.target.value })} onBlur={() => void api(`/api/receipts/${id}`, { method: "PATCH", body: JSON.stringify({ store: receipt.store }) }).catch(() => setError("Le magasin n’a pas pu être enregistré."))} /></label><p>{receipt.purchaseDate || "Date non lue"}</p></header>
        {receipt.items.map(item => <div className="receipt-line" key={item.id}><div className="receipt-item-top"><input type="checkbox" checked={item.accepted !== 0} onChange={e => void patchItem(item, "accepted", e.target.checked ? 1 : 0)} aria-label={`Inclure ${item.description}`} /><input value={item.description} onChange={e => setReceipt({ ...receipt, items: receipt.items.map(x => x.id === item.id ? { ...x, description: e.target.value } : x) })} onBlur={() => void patchItem(item, "description", item.description)} /><input type="number" step="0.01" value={item.amount} onChange={e => setReceipt({ ...receipt, items: receipt.items.map(x => x.id === item.id ? { ...x, amount: Number(e.target.value) } : x) })} onBlur={() => void patchItem(item, "amount", item.amount)} aria-label="Montant" /></div><div className="receipt-item-meta"><label>Qté<input type="number" step="0.1" value={item.quantity ?? 1} onChange={e => void patchItem(item, "quantity", Number(e.target.value))} /></label><label>Catégorie<select value={item.category ?? "Autres"} onChange={e => void patchCategory(item, e.target.value)}><option value="">Choisir</option>{categories.filter(category => category.kind !== "income").map(category => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label><label>Sous-catégorie<select value={item.subcategory ?? ""} onChange={e => void patchItem(item, "subcategory", e.target.value || null)} disabled={!categoryFor(item)}><option value="">Aucune</option>{categoryFor(item)?.subcategories.map(subcategory => <option key={subcategory.id} value={subcategory.name}>{subcategory.name}</option>)}</select></label></div><p className="receipt-raw">Texte lu : {item.rawText || "—"} {item.confidence != null && item.confidence < .6 && <span className="state-warn"> · ! À vérifier</span>}</p></div>)}
        <div className="receipt-totals"><div className="receipt-total-line"><span>Somme des lignes</span><strong>{formatMoney(sum)}</strong></div><div className="receipt-total-line"><span>Total du reçu</span><strong>{formatMoney(receipt.total ?? sum)}</strong></div><div className="receipt-total-line difference"><span>Écart</span><strong>{formatMoney((receipt.total ?? sum) - sum)}</strong></div></div>
        {stamp && <span className="stamp animate">AJOUTÉ</span>}
        <div className="actions"><button className="btn" onClick={() => void api(`/api/receipts/${id}/items`, { method: "POST", body: JSON.stringify({ description: "Nouvelle ligne", amount: 0, category: "Autres" }) }).then(load).catch(() => setError("Ajouter une ligne n’est pas disponible dans cette version."))}>Ajouter une ligne</button><button className="btn" onClick={() => void api(`/api/receipts/${id}/reanalyze`, { method: "POST" }).then(load).catch(() => setError("La relance n’est pas disponible. Vérifie la clé Gemini dans Paramètres."))}>Relancer la lecture</button><button className="btn primary" onClick={() => void confirm()} disabled={receipt.status === "confirmed"}>Confirmer {receipt.items.filter(i => i.accepted !== 0).length} dépenses ({formatMoney(sum)})</button></div>
      </section>
    </div>
  </AppShell>;
}
