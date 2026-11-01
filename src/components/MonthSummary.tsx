"use client";

import Link from "next/link";
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatMoney, formatMoneyShort, monthTitle } from "@/lib/money";

/**
 * Résumé du mois : l'élément vedette de l'accueil.
 * Composant composé (composition-patterns) : <MonthSummary> fournit les données,
 * ses sous-composants les affichent. Aucune option booléenne.
 */

type Fixed = {
  recurringId: number;
  name: string;
  amount: number;
  type: "expense" | "income";
  date: string;
  status: "paid" | "upcoming";
};

type SummaryState = {
  month: string;
  spent: number;
  income: number;
  fixed: Fixed[];
  daysInMonth: number;
  today: number | null;
};

const SummaryContext = createContext<SummaryState | null>(null);

function useSummary() {
  const value = use(SummaryContext);
  if (!value) throw new Error("MonthSummary.* doit être placé dans <MonthSummary>.");
  return value;
}

function Root({ month, spent, income, children }: { month: string; spent: number; income: number; children: ReactNode }) {
  const [fixed, setFixed] = useState<Fixed[]>([]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/recurring/upcoming?month=${month}`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((json) => alive && setFixed(json.items ?? []))
      .catch(() => alive && setFixed([]));
    return () => {
      alive = false;
    };
  }, [month]);

  const value = useMemo<SummaryState>(() => {
    const [year, m] = month.split("-").map(Number);
    const daysInMonth = new Date(year, m, 0).getDate();
    const now = new Date();
    const today = now.getFullYear() === year && now.getMonth() + 1 === m ? now.getDate() : null;
    return { month, spent, income, fixed, daysInMonth, today };
  }, [month, spent, income, fixed]);

  return (
    <SummaryContext value={value}>
      <section className="ms" aria-labelledby="ms-title">
        {children}
      </section>
    </SummaryContext>
  );
}

function Headline() {
  const { month, spent, income } = useSummary();
  const remaining = income - spent;
  const hasIncome = income > 0;
  return (
    <div className="ms-headline">
      <p className="ms-eyebrow">{monthTitle(month)}</p>
      <h2 id="ms-title" className="ms-title">
        {hasIncome ? (
          remaining >= 0 ? (
            <>
              Il te reste <span className="ms-amount">{formatMoneyShort(remaining)}</span>
            </>
          ) : (
            <>
              Dépassement de <span className="ms-amount over">{formatMoneyShort(-remaining)}</span>
            </>
          )
        ) : (
          <>
            Dépensé : <span className="ms-amount">{formatMoneyShort(spent)}</span>
          </>
        )}
      </h2>
      <p className="ms-sub">
        {hasIncome
          ? `Sur ${formatMoneyShort(income)} de revenus, ${formatMoneyShort(spent)} sont déjà dépensés.`
          : "Ajoute ton salaire dans Dépenses fixes pour voir ce qu’il te reste."}
      </p>
    </div>
  );
}

/** Barre du mois : part dépensée, jour actuel et échéances des dépenses fixes. */
function Rail() {
  const { spent, income, fixed, daysInMonth, today } = useSummary();
  const ratio = income > 0 ? Math.min(spent / income, 1) : 0;
  const timeRatio = today ? today / daysInMonth : 1;
  const ahead = income > 0 && ratio > timeRatio + 0.05;
  const position = (date: string) => `${((Number(date.slice(8)) - 0.5) / daysInMonth) * 100}%`;
  return (
    <div className="ms-rail-wrap">
      <div
        className="ms-rail"
        role="meter"
        aria-label="Part des revenus déjà dépensée"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <span className={`ms-rail-fill ${ahead ? "ahead" : ""}`} style={{ width: `${ratio * 100}%` }} />
        {today && <span className="ms-rail-today" style={{ left: `${timeRatio * 100}%` }} aria-hidden />}
        {fixed.map((item) => (
          <span
            key={`${item.recurringId}-${item.date}`}
            className={`ms-rail-mark ${item.status} ${item.type}`}
            style={{ left: position(item.date) }}
            title={`${item.name} · ${formatMoney(item.amount)} · ${item.status === "paid" ? "payé" : "à venir"}`}
            aria-hidden
          />
        ))}
      </div>
      <div className="ms-rail-legend">
        <span>1</span>
        {today && <span className="ms-today-label">Aujourd’hui : {Math.round(timeRatio * 100)}&nbsp;% du mois</span>}
        <span>{daysInMonth}</span>
      </div>
      {income > 0 && (
        <p className={`ms-pace ${ahead ? "warn" : "ok"}`} role="status">
          {ahead
            ? `Tu as dépensé ${Math.round(ratio * 100)} % de tes revenus alors que le mois n’est qu’à ${Math.round(timeRatio * 100)} %.`
            : `Rythme normal : ${Math.round(ratio * 100)} % dépensé pour ${Math.round(timeRatio * 100)} % du mois.`}
        </p>
      )}
    </div>
  );
}

function Figures() {
  const { spent, income, fixed } = useSummary();
  const upcoming = fixed.filter((f) => f.type === "expense" && f.status === "upcoming");
  const upcomingTotal = upcoming.reduce((sum, f) => sum + f.amount, 0);
  return (
    <dl className="ms-figures">
      <div>
        <dt>Revenus</dt>
        <dd className="pos">{formatMoneyShort(income)}</dd>
      </div>
      <div>
        <dt>Dépensé</dt>
        <dd>{formatMoneyShort(spent)}</dd>
      </div>
      <div>
        <dt>Fixes à venir</dt>
        <dd>
          {formatMoneyShort(upcomingTotal)}
          <small>
            {upcoming.length} échéance{upcoming.length > 1 ? "s" : ""} ·{" "}
            <Link href="/depenses-fixes">voir</Link>
          </small>
        </dd>
      </div>
    </dl>
  );
}

export const MonthSummary = Object.assign(Root, { Headline, Rail, Figures });
