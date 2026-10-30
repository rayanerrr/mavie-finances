"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { formatMoney } from "@/lib/money";

type Receipt = {
  id: number;
  filename: string;
  status: string;
  store: string | null;
  createdAt: string;
  items: Array<{ amount: number }>;
};

export default function RecusPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/receipts");
      if (res.ok) {
        const json = await res.json();
        setReceipts(json.receipts);
      }
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
      <section className="panel">
        {receipts.length === 0 ? (
          <p className="empty">Aucun reçu. Va dans Ajouter un achat pour uploader.</p>
        ) : (
          <ul className="list">
            {receipts.map((r) => {
              const total = r.items.reduce((s, i) => s + i.amount, 0);
              return (
                <li key={r.id}>
                  <div>
                    <strong>
                      #{r.id} · {r.filename}
                    </strong>
                    <div className="muted small">
                      {r.store ?? "Marchand inconnu"} · {r.status} · {r.createdAt}
                    </div>
                  </div>
                  <div className="right">
                    <strong>{formatMoney(total)}</strong>
                    <span className="muted">{r.items.length} items</span>
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
