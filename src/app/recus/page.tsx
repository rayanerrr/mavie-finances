"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { formatMoney } from "@/lib/money";
import { SoftError } from "@/components/FinanceWidgets";

type Receipt = {
  id: number;
  filename: string;
  status: string;
  store: string | null;
  createdAt: string;
  items: Array<{ amount: number }>;
  total?: number | null;
  purchaseDate?: string | null;
  origin?: string;
};

export default function RecusPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/receipts");
      if (res.ok) {
        const json = await res.json();
        setReceipts(json.receipts);
      } else setError(res.status === 404 ? "La liste des reçus n’est pas disponible pour le moment." : "Impossible de charger tes reçus.");
    })();
  }, []);

  return (
    <AppShell
      title="Reçus & scan"
      actions={
        <Link href="/ajouter" className="btn primary">
          Nouveau scan
        </Link>
      }
    >
      {error && <SoftError message={error} />}
      <section className="panel">
        {receipts.length === 0 ? (
          <p className="empty">Aucun reçu. Va dans Ajouter un achat pour uploader.</p>
        ) : (
          <ul className="receipt-list">
            {receipts.map((r) => {
              const total = r.total ?? r.items.reduce((s, i) => s + i.amount, 0);
              return (
                <li key={r.id} className="receipt-card">
                  <Link className="receipt-card-link" href={`/recus/${r.id}`}>
                    <span className="receipt-thumb" aria-hidden="true">🧾</span><div>
                    <strong>
                      {r.store ?? "Marchand inconnu"}
                    </strong>
                    <div className="muted small">
                      {r.purchaseDate || r.createdAt} · {r.items.length} articles
                    </div>
                    <span className="receipt-origin">{r.origin === "icloud" ? "iPhone" : "Mac"}</span>
                  </div></Link>
                  <div className="right">
                    <strong>{formatMoney(total)}</strong>
                    <span className={`state-label ${r.status === "error" ? "state-over" : r.status === "analyzed" ? "state-warn" : "state-ok"}`}>{r.status === "analyzed" ? "! À vérifier" : r.status === "confirmed" ? "✓ Confirmé" : r.status === "error" ? "! Erreur" : "Lecture…"}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
