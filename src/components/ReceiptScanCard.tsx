"use client";
/* eslint-disable react-hooks/set-state-in-effect -- chargement des données au montage */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconArrowRight,
  IconCamera,
  IconCheck,
  IconReceipt,
} from "@/components/icons";
import { formatMoney } from "@/lib/money";

type ReceiptItem = {
  id: number;
  description: string;
  amount: number;
  category: string | null;
  subcategory: string | null;
  accepted: number;
};

type Receipt = {
  id: number;
  filename: string;
  mime: string;
  status: "pending" | "analyzing" | "analyzed" | "error" | "confirmed" | string;
  error?: string | null;
  store: string | null;
  items: ReceiptItem[];
};

type Tab = "photo" | "quick" | "pdf";

const STEPS = [
  "Lecture du texte",
  "Extraction des items",
  "Catégorisation",
  "Ajout à vos transactions",
];

function stepsDone(status?: string) {
  if (status === "confirmed") return 4;
  if (status === "analyzed") return 3;
  return 0;
}

export function ReceiptScanCard({ onImported }: { onImported?: () => void }) {
  const [tab, setTab] = useState<Tab>("photo");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [accounts, setAccounts] = useState<Array<{ id: number; name: string }>>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [qDesc, setQDesc] = useState("");
  const [qAmount, setQAmount] = useState("");
  const [qCategory, setQCategory] = useState("Alimentation");
  const [qStore, setQStore] = useState("");
  const [qPerson, setQPerson] = useState("moi");
  const [qAccount, setQAccount] = useState<number | "">("");

  const loadReceipt = useCallback(async (id?: number) => {
    if (id) {
      const res = await fetch(`/api/receipts/${id}`);
      if (!res.ok) return;
      const next: Receipt = (await res.json()).receipt;
      // Reçu illisible : on ne le laisse pas bloquer la carte, on passe au suivant.
      if (next.status === "error") {
        setReviewing(false);
        setMsg("Reçu illisible : retiré de l’accueil (il reste dans Reçus & scan).");
        id = undefined;
      } else {
        setReceipt(next);
        return;
      }
    }
    const res = await fetch("/api/receipts");
    if (!res.ok) return;
    const json = await res.json();
    const list: Receipt[] = (json.receipts ?? []).filter((r: Receipt) => r.status !== "error");
    setReceipt(list.find((r) => r.status !== "confirmed") ?? list[0] ?? null);
  }, []);

  useEffect(() => {
    void loadReceipt();
    void (async () => {
      const [a, c] = await Promise.all([fetch("/api/accounts"), fetch("/api/categories")]);
      if (a.ok) {
        const json = await a.json();
        setAccounts(json.accounts);
        if (json.accounts[0]) setQAccount(json.accounts[0].id);
      }
      if (c.ok) {
        const json = await c.json();
        setCategories(
          json.categories
            .filter((x: { kind: string }) => x.kind !== "income")
            .map((x: { name: string }) => x.name),
        );
      }
    })();
  }, [loadReceipt]);

  useEffect(() => {
    if (receipt?.status !== "pending" && receipt?.status !== "analyzing") return;
    const id = receipt.id;
    const timer = setInterval(() => void loadReceipt(id), 2000);
    return () => clearInterval(timer);
  }, [receipt?.status, receipt?.id, loadReceipt]);

  async function upload(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (qAccount) form.append("accountId", String(qAccount));
      const res = await fetch("/api/receipts", { method: "POST", body: form });
      if (!res.ok) throw new Error("Échec du téléversement");
      const json = await res.json();
      setReviewing(false);
      setReceipt({ ...json.receipt, items: [] });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function toggleItem(item: ReceiptItem) {
    if (!receipt) return;
    await fetch(`/api/receipts/${receipt.id}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, accepted: item.accepted !== 1 }),
    });
    await loadReceipt(receipt.id);
  }

  async function confirm() {
    if (!receipt) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/receipts/${receipt.id}/confirm`, { method: "POST" });
      if (!res.ok) throw new Error("Échec de la confirmation");
      setReviewing(false);
      await loadReceipt(receipt.id);
      onImported?.();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function addQuick() {
    const amount = Number(qAmount.replace(",", "."));
    if (!qDesc.trim() || !Number.isFinite(amount) || amount <= 0) {
      setMsg("Description et montant requis.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            date: new Date().toISOString().slice(0, 10),
            amount,
            description: qDesc.trim(),
            category: qCategory,
            store: qStore.trim() || null,
            person: qPerson,
            accountId: qAccount || null,
            source: "text",
            type: "expense",
          },
        ]),
      });
      if (!res.ok) throw new Error("Échec de l’ajout");
      setQDesc("");
      setQAmount("");
      setQStore("");
      setMsg("Achat ajouté.");
      onImported?.();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const done = stepsDone(receipt?.status);
  const accepted = receipt?.items.filter((i) => i.accepted === 1) ?? [];
  const acceptedTotal = accepted.reduce((s, i) => s + i.amount, 0);

  return (
    <section className="card scan-card">
      <h2 className="card-title">Ajouter un achat</h2>

      <div className="segmented">
        {(
          [
            ["photo", "Photo du reçu"],
            ["quick", "Saisie rapide"],
            ["pdf", "Fichier PDF"],
          ] as Array<[Tab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "quick" ? (
        <div className="quick-grid">
          <input value={qDesc} onChange={(e) => setQDesc(e.target.value)} placeholder="Description (ex. plein d’essence)" />
          <div className="quick-2">
            <input value={qAmount} onChange={(e) => setQAmount(e.target.value)} placeholder="Montant $" inputMode="decimal" />
            <input value={qStore} onChange={(e) => setQStore(e.target.value)} placeholder="Marchand" />
          </div>
          <div className="quick-2">
            <select value={qCategory} onChange={(e) => setQCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select value={qPerson} onChange={(e) => setQPerson(e.target.value)}>
              <option value="moi">Moi</option>
              <option value="femme">Ma femme</option>
              <option value="fils">Mon fils</option>
            </select>
          </div>
          <select value={qAccount} onChange={(e) => setQAccount(e.target.value ? Number(e.target.value) : "")}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void addQuick()}>
            Ajouter l’achat <IconArrowRight size={14} />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className={`dropzone ${dragging ? "dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void upload(file);
            }}
          >
            <span className="dropzone-icon">
              <IconCamera size={18} />
            </span>
            <strong>
              {tab === "pdf" ? "Glissez un fichier PDF ici" : "Glissez une image de reçu ici"}
            </strong>
            <span>ou cliquez pour sélectionner</span>
            <em>{tab === "pdf" ? "PDF" : "JPG, PNG, HEIC, PDF"}</em>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept={tab === "pdf" ? "application/pdf" : "image/*,.heic,application/pdf"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
          </button>

          {receipt && (
            <div className="scan-row">
              <div className="scan-thumb">
                {receipt.mime.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/receipts/${receipt.id}/file?f=${encodeURIComponent(receipt.filename)}`}
                    alt={`Reçu ${receipt.filename}`}
                  />
                ) : (
                  <span className="scan-thumb-pdf">
                    <IconReceipt size={28} />
                    PDF
                  </span>
                )}
              </div>

              <div className="scan-status">
                {receipt.status === "pending" || receipt.status === "analyzing" ? (
                  <div className="scan-head">
                    <span className="scan-badge pending">
                      <span className="spinner" />
                    </span>
                    <div>
                      <strong className="pending-text">{receipt.status === "analyzing" ? "Analyse en cours" : "En attente d’analyse"}</strong>
                      <span>L’IA lit ton reçu automatiquement…</span>
                    </div>
                  </div>
                ) : (
                  <div className="scan-head">
                    <span className="scan-badge ok">
                      <IconCheck size={14} />
                    </span>
                    <div>
                      <strong className="ok-text">
                        {receipt.status === "confirmed" ? "Reçu ajouté !" : "Reçu analysé !"}
                      </strong>
                      <span>{receipt.items.length} items détectés</span>
                    </div>
                  </div>
                )}

                {receipt.status === "error" ? (
                  <div className="scan-actions">
                    <span className="scan-msg">{receipt.error || "La lecture a échoué."}</span>
                    <button type="button" className="btn-primary" disabled={busy} onClick={async () => { setBusy(true); try { const res = await fetch(`/api/receipts/${receipt.id}/reanalyze`, { method: "POST" }); if (!res.ok) throw new Error("Relance impossible."); await loadReceipt(receipt.id); } catch (err) { setMsg(err instanceof Error ? err.message : "Relance impossible."); } finally { setBusy(false); } }}>Relancer</button>
                  </div>
                ) : receipt.status === "analyzed" ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setReviewing((v) => !v)}
                  >
                    Vérifier et confirmer <IconArrowRight size={14} />
                  </button>
                ) : null}


                <ul className="steps">
                  {STEPS.map((step, i) => (
                    <li key={step} className={i < done ? "done" : ""}>
                      <span className="step-dot">{i < done && <IconCheck size={10} />}</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {reviewing && receipt?.status === "analyzed" && (
            <div className="review">
              <ul>
                {receipt.items.map((item) => (
                  <li key={item.id} className={item.accepted === 1 ? "" : "off"}>
                    <label>
                      <input
                        type="checkbox"
                        checked={item.accepted === 1}
                        onChange={() => void toggleItem(item)}
                      />
                      <span>
                        <strong>{item.description}</strong>
                        <em>
                          {item.category ?? "Autres"}
                          {item.subcategory ? ` › ${item.subcategory}` : ""}
                        </em>
                      </span>
                    </label>
                    <span className="review-amount">{formatMoney(item.amount)}</span>
                  </li>
                ))}
              </ul>
              <div className="review-foot">
                <span>
                  Total <strong>{formatMoney(acceptedTotal)}</strong>
                </span>
                <button type="button" className="btn-primary" disabled={busy || !accepted.length} onClick={() => void confirm()}>
                  Confirmer l’ajout ({accepted.length})
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {msg && <p className="scan-msg">{msg}</p>}
    </section>
  );
}
