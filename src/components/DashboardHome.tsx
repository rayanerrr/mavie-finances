"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DonutChart, EvolutionChart, SubcategoryBars } from "@/components/charts";
import {
  IconArrowDown,
  IconArrowUp,
  IconBulb,
  IconCalendar,
  IconCard,
  IconChevronLeft,
  IconChevronRight,
  IconGamepad,
  IconGauge,
  IconHome,
  IconSearch,
  CategoryIcon,
} from "@/components/icons";
import { ReceiptScanCard } from "@/components/ReceiptScanCard";
import { MonthRail, SoftError } from "@/components/FinanceWidgets";
import { TransactionsTable, type TxRow } from "@/components/TransactionsTable";
import { BREAKDOWN_COLORS } from "@/lib/classify";
import {
  currentMonthKey,
  formatMoneyShort,
  monthTitle,
  nextMonthKey,
  previousMonthKey,
} from "@/lib/money";

type CategoryTotal = {
  categoryId: number;
  categoryName: string;
  total: number;
  count: number;
  color: string;
};

type Suggestion = {
  tone: "warn" | "info" | "good";
  icon: "gauge" | "fork" | "car" | "bulb";
  title: string;
  body: string;
};

type InsightsPayload = {
  total: number;
  count: number;
  byCategory: CategoryTotal[];
  insights: {
    previousMonthName: string;
    deltaPct: number | null;
    essential: number;
    discretionary: number;
    essentialPct: number;
    discretionaryPct: number;
    potentialSavings: number;
    incomeTotal: number;
    suggestions: Suggestion[];
    evolution: {
      categoryNames: string[];
      series: Array<{
        monthKey: string;
        total: number;
        byCategory: Array<{ category: string; total: number; color: string }>;
      }>;
    };
  };
};

type Account = { id: number; name: string };

const SUGGESTION_ICON = {
  gauge: <IconGauge size={16} />,
  fork: <CategoryIcon icon="fork" size={16} />,
  car: <CategoryIcon icon="car" size={16} />,
  bulb: <IconBulb size={16} />,
};

export function DashboardHome() {
  const [month, setMonth] = useState(currentMonthKey());
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txAccount, setTxAccount] = useState("");
  const [txPeriod, setTxPeriod] = useState<"month" | "all">("month");
  const [evoMode, setEvoMode] = useState<"category" | "total">("category");
  const [breakdownId, setBreakdownId] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<
    Array<{ subcategoryName: string | null; total: number }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null>(null);

  const loadInsights = useCallback(async () => {
    try {
      const [res, budgetRes] = await Promise.all([fetch(`/api/insights?month=${month}`), fetch(`/api/budgets?month=${month}`)]);
      if (!res.ok) throw new Error("Impossible de charger le tableau de bord");
      setData(await res.json());
      if (budgetRes.ok) {
        const json = await budgetRes.json();
        setBudget(json.budgets.reduce((sum: number, item: { amount: number }) => sum + Number(item.amount), 0) || null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }, [month]);

  const loadRows = useCallback(async () => {
    const params = new URLSearchParams();
    if (txPeriod === "month") params.set("month", month);
    if (txCategory) params.set("categoryId", txCategory);
    if (txAccount) params.set("accountId", txAccount);
    if (search.trim()) params.set("q", search.trim());
    params.set("limit", "50");
    const res = await fetch(`/api/expenses?${params}`);
    if (res.ok) setRows((await res.json()).expenses);
  }, [month, txCategory, txAccount, txPeriod, search]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/accounts");
      if (res.ok) setAccounts((await res.json()).accounts);
    })();
  }, []);

  const activeBreakdownId = useMemo(() => {
    if (!data?.byCategory.length) return null;
    if (breakdownId && data.byCategory.some((c) => c.categoryId === breakdownId)) {
      return breakdownId;
    }
    const food = data.byCategory.find((c) => c.categoryName === "Alimentation");
    return (food ?? data.byCategory[0]).categoryId;
  }, [data, breakdownId]);

  useEffect(() => {
    if (!activeBreakdownId) {
      setBreakdown([]);
      return;
    }
    void (async () => {
      const res = await fetch(`/api/summary?month=${month}&categoryId=${activeBreakdownId}`);
      if (!res.ok) return;
      const json = await res.json();
      setBreakdown(
        json.bySubcategory.map((s: { subcategoryName: string | null; total: number }) => ({
          subcategoryName: s.subcategoryName,
          total: Number(s.total),
        })),
      );
    })();
  }, [month, activeBreakdownId, data]);

  const breakdownCategory = data?.byCategory.find((c) => c.categoryId === activeBreakdownId);
  const breakdownTotal = breakdown.reduce((s, b) => s + b.total, 0);
  const breakdownItems = breakdown.slice(0, 9).map((b, i) => ({
    label: b.subcategoryName ?? "Autres",
    value: b.total,
    color: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
    pct: breakdownTotal > 0 ? (b.total / breakdownTotal) * 100 : 0,
  }));

  const refreshAll = () => {
    void loadInsights();
    void loadRows();
  };

  const deltaPct = data?.insights.deltaPct ?? null;
  const total = data?.total ?? 0;
  const income = data?.insights.incomeTotal ?? 0;
  const remaining = income > 0 ? income - total : budget !== null ? budget - total : null;

  return (
    <div className="dash">
      <div className="dash-main">
        <div className="toolbar">
          <label className="search">
            <IconSearch size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une transaction, un marchand, une catégorie…"
            />
          </label>
          <div className="month-nav">
            <button type="button" aria-label="Mois précédent" onClick={() => setMonth(previousMonthKey(month))}>
              <IconChevronLeft size={15} />
            </button>
            <span>
              <IconCalendar size={15} />
              {monthTitle(month)}
            </span>
            <button type="button" aria-label="Mois suivant" onClick={() => setMonth(nextMonthKey(month))}>
              <IconChevronRight size={15} />
            </button>
          </div>
        </div>

        {error && <SoftError message={`${error} Réessaie ou ouvre Paramètres si une route manque.`} />}

        <section className="hero">
          <p className="hero-label">Pour le mois de {monthTitle(month).toLowerCase()}</p>
          <strong className="hero-value">{remaining === null ? "Aucun budget défini" : `Il te reste ${formatMoneyShort(remaining)}`}</strong>
          <p>{remaining !== null ? (income > 0 ? "Après tes revenus et tes dépenses suivies." : "Après tes dépenses suivies, selon tes budgets.") : "Définis un budget ou un revenu pour voir ce qu’il te reste."}</p>
        </section>
        <div className="stat-line">
          <a href="/transactions"><strong>{formatMoneyShort(total)}</strong><span>Dépensé</span></a>
          <a href="/budgets"><strong>{formatMoneyShort(data?.insights.essential ?? 0)}</strong><span>Essentiel</span></a>
          <Link href="/transactions"><strong>{data?.count ?? 0}</strong><span>Transactions</span></Link>
          <a href="/depenses-fixes"><strong>{formatMoneyShort(data?.insights.potentialSavings ?? 0)}</strong><span>Économies possibles</span></a>
        </div>
        <section className="card"><div className="card-head"><h2 className="card-title">Le mois en un coup d’œil</h2><Link className="btn ghost" href="/depenses-fixes">Voir les fixes</Link></div><MonthRail month={month} /></section>
        <section className="kpis">
          <article className="card kpi">
            <span className="kpi-icon red">
              <IconCard size={18} />
            </span>
            <div>
              <span className="kpi-label">Dépenses totales</span>
              <strong className="kpi-value">{formatMoneyShort(total)}</strong>
              {deltaPct === null ? (
                <span className="kpi-sub">Premier mois suivi</span>
              ) : (
                <span className="kpi-sub">
                  <b className={deltaPct > 0 ? "neg" : "pos"}>
                    {deltaPct > 0 ? <IconArrowUp size={11} /> : <IconArrowDown size={11} />}
                    {Math.abs(deltaPct).toFixed(0)}%
                  </b>{" "}
                  vs. {data?.insights.previousMonthName}
                </span>
              )}
            </div>
          </article>
          <article className="card kpi">
            <span className="kpi-icon blue">
              <IconHome size={18} />
            </span>
            <div>
              <span className="kpi-label">Dépenses essentielles</span>
              <strong className="kpi-value">{formatMoneyShort(data?.insights.essential ?? 0)}</strong>
              <span className="kpi-sub">{(data?.insights.essentialPct ?? 0).toFixed(0)}% du total</span>
            </div>
          </article>
          <article className="card kpi">
            <span className="kpi-icon purple">
              <IconGamepad size={18} />
            </span>
            <div>
              <span className="kpi-label">Dépenses discrétionnaires</span>
              <strong className="kpi-value">{formatMoneyShort(data?.insights.discretionary ?? 0)}</strong>
              <span className="kpi-sub">{(data?.insights.discretionaryPct ?? 0).toFixed(0)}% du total</span>
            </div>
          </article>
          <article className="card kpi">
            <span className="kpi-icon green">
              <IconBulb size={18} />
            </span>
            <div>
              <span className="kpi-label">Économies potentielles</span>
              <strong className="kpi-value">~ {formatMoneyShort(data?.insights.potentialSavings ?? 0)}</strong>
              <span className="kpi-sub">Basé sur vos habitudes</span>
            </div>
          </article>
        </section>

        <section className="charts-row">
          <div className="card">
            <h2 className="card-title">Dépenses par catégorie</h2>
            <div className="donut-layout">
              <DonutChart
                slices={(data?.byCategory ?? []).map((c) => ({
                  label: c.categoryName,
                  value: c.total,
                  color: c.color,
                }))}
                centerValue={formatMoneyShort(total)}
                centerLabel={monthTitle(month)}
              />
              <ul className="legend">
                {(data?.byCategory ?? []).map((c) => (
                  <li key={c.categoryId}>
                    <i style={{ background: c.color }} />
                    <span className="legend-name">{c.categoryName}</span>
                    <span className="legend-amount">{formatMoneyShort(c.total)}</span>
                    <span className="legend-pct">
                      {total > 0 ? ((c.total / total) * 100).toFixed(0) : 0}%
                    </span>
                  </li>
                ))}
                {!data?.byCategory.length && <li className="muted">Aucune dépense ce mois-ci.</li>}
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2 className="card-title">Évolution des dépenses</h2>
              <select
                className="mini-select"
                value={evoMode}
                onChange={(e) => setEvoMode(e.target.value as "category" | "total")}
              >
                <option value="category">Par catégorie</option>
                <option value="total">Total</option>
              </select>
            </div>
            {data && (
              <EvolutionChart
                series={data.insights.evolution.series}
                categoryNames={data.insights.evolution.categoryNames}
                mode={evoMode}
              />
            )}
          </div>
        </section>

        <section className="card tx-card">
          <div className="card-head tx-head">
            <h2 className="card-title">Transactions</h2>
            <div className="tx-filters">
              <label className="search small">
                <IconSearch size={13} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" />
              </label>
              <select className="mini-select" value={txCategory} onChange={(e) => setTxCategory(e.target.value)}>
                <option value="">Toutes les catégories</option>
                {(data?.byCategory ?? []).map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.categoryName}
                  </option>
                ))}
              </select>
              <select className="mini-select" value={txAccount} onChange={(e) => setTxAccount(e.target.value)}>
                <option value="">Tous les comptes</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select
                className="mini-select"
                value={txPeriod}
                onChange={(e) => setTxPeriod(e.target.value as "month" | "all")}
              >
                <option value="month">Ce mois</option>
                <option value="all">Tout</option>
              </select>
            </div>
          </div>
          <TransactionsTable rows={rows} />
        </section>
      </div>

      <aside className="dash-side">
        <ReceiptScanCard onImported={refreshAll} />

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Répartition détaillée</h2>
            <select
              className="mini-select"
              value={activeBreakdownId ?? ""}
              onChange={(e) => setBreakdownId(Number(e.target.value))}
            >
              {(data?.byCategory ?? []).map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName}
                </option>
              ))}
            </select>
            <strong className="breakdown-total">
              {formatMoneyShort(breakdownCategory?.total ?? 0)}
            </strong>
          </div>
          {breakdownItems.length ? (
            <SubcategoryBars items={breakdownItems} />
          ) : (
            <p className="empty">Rien à afficher.</p>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">Aperçus &amp; Conseils</h2>
          <ul className="advice">
            {(data?.insights.suggestions ?? []).map((s) => (
              <li key={s.title}>
                <Link href="/analyses">
                  <span className={`advice-icon ${s.tone}`}>{SUGGESTION_ICON[s.icon]}</span>
                  <span className="advice-text">
                    <strong>{s.title}</strong>
                    <span>{s.body}</span>
                  </span>
                  <IconChevronRight size={15} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
