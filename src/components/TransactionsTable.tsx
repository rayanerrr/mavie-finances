"use client";

import { CategoryChip } from "@/components/CategoryChip";
import { MerchantLogo, merchantLabel } from "@/components/MerchantLogo";
import { formatMoney } from "@/lib/money";

export type TxRow = {
  id: number;
  date: string;
  amount: number;
  description: string;
  store: string | null;
  person: string | null;
  type: string;
  merchantKey: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  subcategoryName: string | null;
  accountName: string | null;
  notes: string | null;
};

function formatShortDate(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function TransactionsTable({ rows }: { rows: TxRow[] }) {
  if (!rows.length) {
    return <p className="empty">Aucune transaction pour ces filtres.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="tx-table">
        <thead>
          <tr>
            <th className="check">
              <input type="checkbox" aria-label="Tout sélectionner" />
            </th>
            <th>Date</th>
            <th>Marchand</th>
            <th>Description</th>
            <th>Catégorie</th>
            <th>Sous-catégorie</th>
            <th className="num">Montant</th>
            <th>Compte</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tx) => {
            const income = tx.type === "income";
            return (
              <tr key={tx.id}>
                <td className="check">
                  <input type="checkbox" aria-label={`Sélectionner ${tx.description}`} />
                </td>
                <td className="nowrap">{formatShortDate(tx.date)}</td>
                <td>
                  <span className="merchant">
                    <MerchantLogo merchantKey={tx.merchantKey} store={tx.store} />
                    {tx.merchantKey || tx.store ? merchantLabel(tx.merchantKey, tx.store) : <span className="muted">—</span>}
                  </span>
                </td>
                <td className="desc" title={tx.person ? `Pour : ${tx.person}` : undefined}>
                  {tx.description}
                </td>
                <td>
                  <CategoryChip name={tx.categoryName} color={tx.categoryColor} />
                </td>
                <td>
                  <span className="sub-chip">{tx.subcategoryName ?? "—"}</span>
                </td>
                <td className={`num ${income ? "amount-pos" : "amount-neg"}`}>
                  {income ? "+" : "-"}
                  {formatMoney(tx.amount)}
                </td>
                <td className="muted nowrap">{tx.accountName ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
