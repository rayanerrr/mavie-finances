"use client";

import { Fragment } from "react";
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
  accountId: number | null;
  notes: string | null;
  source: string;
};

function formatShortDate(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function TransactionsLedger({ rows, onSelect }: { rows: TxRow[]; onSelect?: (row: TxRow) => void }) {
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
            <th>Source</th>
            <th className="num">Montant</th>
            <th>Compte</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tx, index) => {
            const income = tx.type === "income";
            const previous = rows[index - 1];
            const firstOfDay = !previous || previous.date !== tx.date;
            const dayTotal = rows.filter((item) => item.date === tx.date).reduce((sum, item) => sum + (item.type === "income" ? item.amount : -item.amount), 0);
            const source = tx.source === "receipt" ? "🧾 Reçu" : tx.source === "recurring" ? "↻ Fixe" : "✎ Manuel";
            return (
              <Fragment key={tx.id}>
                {firstOfDay && <tr className="day-head-row"><th colSpan={9}><span>{formatShortDate(tx.date)}</span><strong>{dayTotal >= 0 ? "+" : "−"}{formatMoney(Math.abs(dayTotal))}</strong></th></tr>}
              <tr className="tx-row" onClick={() => onSelect?.(tx)} tabIndex={onSelect ? 0 : undefined} onKeyDown={(event) => { if (event.key === "Enter") onSelect?.(tx); }}>
                <td className="check">
                  <input type="checkbox" aria-label={`Sélectionner ${tx.description}`} onClick={(event) => event.stopPropagation()} />
                </td>
                <td className="nowrap">{formatShortDate(tx.date)}</td>
                <td>
                  {tx.store ? <span className="merchant"><MerchantLogo merchantKey={tx.merchantKey} store={tx.store} />{merchantLabel(tx.merchantKey, tx.store)}</span> : <span className="muted"> </span>}
                </td>
                <td className="desc" title={tx.person ? `Pour : ${tx.person}` : undefined}>
                  {tx.description}
                </td>
                <td>
                  <CategoryChip name={tx.categoryName} color={tx.categoryColor} />
                </td>
                <td>
                  <span className="sub-chip">{tx.subcategoryName ?? ""}</span>
                </td>
                <td><span className="source-badge">{source}</span></td>
                <td className={`num ${income ? "amount-pos" : "amount-neg"}`}>
                  {income ? "+" : "-"}
                  {formatMoney(tx.amount)}
                </td>
                <td className="muted nowrap">{tx.accountName ?? ""}</td>
              </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
