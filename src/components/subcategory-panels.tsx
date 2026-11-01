"use client";

import { useMemo, useState, createElement } from "react";
import { DonutChart, EvolutionChart } from "@/components/charts";
import { MerchantLogo } from "@/components/MerchantLogo";
import { formatMoney, monthName } from "@/lib/money";
import { subcategoryIcon } from "@/lib/sub-icons";
import type { SubcategoryAnalytics } from "@/lib/subcategory-analytics";
import { formatQuantity, formatUnitPrice } from "@/lib/units";

export type Data = SubcategoryAnalytics;
export type Metric = "amount" | "quantity" | "frequency" | "unitPrice";
type ProductPeriod = "month" | "quarter" | "half";

export const SUB_PALETTE = [
  "#f43f5e",
  "#ef4444",
  "#fb7185",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#60a5fa",
  "#a78bfa",
  "#22d3ee",
  "#cbd5e1",
];

export const MERCHANT_PALETTE = ["#f43f5e", "#3b82f6", "#f59e0b", "#a855f7", "#22c55e", "#94a3b8"];

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const PERSON_LABEL: Record<string, string> = { moi: "Moi", femme: "Ma femme", fils: "Mon fils", nous: "Nous" };

export function SubIcon({ name, size = 30 }: { name: string | null; size?: number }) {
  const Glyph = name ? subcategoryIcon(name) : null;
  return (
    <span className="sx-subicon" style={{ width: size, height: size, fontSize: size * 0.55 }}>
      {Glyph ? createElement(Glyph, { size: Math.round(size * 0.55), strokeWidth: 1.75, "aria-hidden": true }) : name ? name.charAt(0) : "•"}
    </span>
  );
}

export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 64;
  const h = 22;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, max);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${(i / Math.max(values.length - 1, 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="sx-spark" aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function DeltaTag({ pct, inverse = false }: { pct: number | null; inverse?: boolean }) {
  if (pct == null) return <span className="sx-delta flat">nouveau</span>;
  if (pct === 0) return <span className="sx-delta flat">→ 0 %</span>;
  const up = pct > 0;
  const bad = inverse ? !up : up;
  return (
    <span className={`sx-delta ${bad ? "bad" : "good"}`}>
      {up ? "↑" : "↓"} {Math.abs(pct)} %
    </span>
  );
}

export function metricValue(sub: Data["subcategories"][number], metric: Metric) {
  if (metric === "quantity") return sub.quantity;
  if (metric === "frequency") return sub.frequency;
  if (metric === "unitPrice") return sub.unitPrice ?? 0;
  return sub.total;
}

export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(1, ...grid.flat());
  return (
    <div className="sx-heat">
      {grid.map((row, d) => (
        <div key={DAYS[d]} className="sx-heat-row">
          <span>{DAYS[d]}</span>
          {row.map((v, h) => (
            <i
              key={h}
              title={`${DAYS[d]} ${h + 6}h : ${v} visite${v > 1 ? "s" : ""}`}
              style={{ background: v ? `rgba(59, 130, 246, ${0.22 + (v / max) * 0.78})` : undefined }}
            />
          ))}
        </div>
      ))}
      <div className="sx-heat-row sx-heat-axis">
        <span />
        {Array.from({ length: 16 }, (_, h) => (
          <em key={h}>{(h + 6) % 3 === 0 ? `${h + 6}h` : ""}</em>
        ))}
      </div>
    </div>
  );
}

export function TopProductsCard({ data, query }: { data: Data; query: string }) {
  const [period, setPeriod] = useState<ProductPeriod>("month");
  const list = data.products[period].filter((p) => matches(p.name, query)).slice(0, 5);
  return (
    <section className="card sx-mini">
      <div className="card-head">
        <h2 className="card-title">Produits les plus achetés</h2>
        <select className="mini-select" value={period} onChange={(e) => setPeriod(e.target.value as ProductPeriod)}>
          <option value="month">Ce mois-ci</option>
          <option value="quarter">3 derniers mois</option>
          <option value="half">6 derniers mois</option>
        </select>
      </div>
      {list.length ? (
        <ul className="sx-top">
          {list.map((p) => (
            <li key={p.key}>
              <SubIcon name={p.subcategory} size={22} />
              <span className="sx-top-name">{p.name}</span>
              <strong>{formatMoney(p.total)}</strong>
              <em>{p.count}x</em>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sx-empty">Aucun produit pour cette période.</p>
      )}
    </section>
  );
}

export function MerchantsCard({ data }: { data: Data }) {
  const slices = merchantSlices(data);
  return (
    <section className="card sx-mini">
      <div className="card-head">
        <h2 className="card-title">Répartition par marchand</h2>
      </div>
      {slices.length ? (
        <div className="sx-merchants">
          <DonutChart slices={slices} centerValue={formatMoney(data.kpis.total)} centerLabel="" />
          <ul>
            {slices.map((s) => (
              <li key={s.label}>
                <i style={{ background: s.color }} />
                <span>{s.label}</span>
                <b>{s.share} %</b>
                <em>{formatMoney(s.value)}</em>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="sx-empty">Aucun achat ce mois-ci.</p>
      )}
    </section>
  );
}

export function MomentsCard({ data }: { data: Data }) {
  const [range, setRange] = useState<"month" | "half">("half");
  return (
    <section className="card sx-mini">
      <div className="card-head">
        <h2 className="card-title">Moments d’achat</h2>
        <select className="mini-select" value={range} onChange={(e) => setRange(e.target.value as "month" | "half")}>
          <option value="month">Ce mois</option>
          <option value="half">6 mois</option>
        </select>
      </div>
      <Heatmap grid={data.heatmap[range]} />
    </section>
  );
}

function merchantSlices(data: Data) {
  const top = data.merchants.slice(0, 4);
  const rest = data.merchants.slice(4);
  const slices = top.map((m, i) => ({
    label: m.store,
    value: m.total,
    share: m.share,
    color: MERCHANT_PALETTE[i],
  }));
  if (rest.length) {
    const value = rest.reduce((s, m) => s + m.total, 0);
    slices.push({
      label: "Autres",
      value,
      share: rest.reduce((s, m) => s + m.share, 0),
      color: MERCHANT_PALETTE[5],
    });
  }
  return slices;
}

export function matches(text: string | null | undefined, query: string) {
  if (!query.trim()) return true;
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  return norm(text ?? "").includes(norm(query.trim()));
}

/* ---------- Tabs other than "Sous-catégories" ---------- */

export function OverviewPanel({ data }: { data: Data }) {
  const subs = data.subcategories.filter((s) => s.total > 0);
  const series = data.months.map((monthKey, i) => ({
    monthKey,
    total: data.subcategories.reduce((s, sub) => s + sub.trend.amount[i], 0),
    byCategory: [],
  }));
  return (
    <div className="sx-two">
      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Part de chaque sous-catégorie</h2>
        </div>
        <div className="sx-merchants">
          <DonutChart
            slices={subs.map((s, i) => ({ label: s.name, value: s.total, color: SUB_PALETTE[i % SUB_PALETTE.length] }))}
            centerValue={formatMoney(data.kpis.total)}
            centerLabel={monthName(data.monthKey)}
          />
          <ul>
            {subs.map((s, i) => (
              <li key={s.id}>
                <i style={{ background: SUB_PALETTE[i % SUB_PALETTE.length] }} />
                <span>{s.name}</span>
                <b>{s.share} %</b>
                <em>{formatMoney(s.total)}</em>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Total {data.category.name.toLowerCase()} sur 6 mois</h2>
        </div>
        <EvolutionChart series={series} categoryNames={[]} mode="total" />
        <p className="sx-note">
          {data.kpis.visits} passages en magasin ce mois-ci, {data.kpis.transactions} articles,{" "}
          {formatMoney(data.kpis.average)} par article en moyenne.
        </p>
      </section>
    </div>
  );
}

export function ProductsPanel({ data, query }: { data: Data; query: string }) {
  const [period, setPeriod] = useState<ProductPeriod>("month");
  const list = data.products[period].filter((p) => matches(p.name, query) || matches(p.subcategory, query));
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Produits ({list.length})</h2>
        <select className="mini-select" value={period} onChange={(e) => setPeriod(e.target.value as ProductPeriod)}>
          <option value="month">Ce mois-ci</option>
          <option value="quarter">3 derniers mois</option>
          <option value="half">6 derniers mois</option>
        </select>
      </div>
      <div className="table-wrap">
        <table className="sx-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Sous-catégorie</th>
              <th className="num">Achats</th>
              <th className="num">Quantité</th>
              <th className="num">Total</th>
              <th className="num">Prix moyen</th>
              <th>Dernier achat</th>
              <th>Magasins</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.key}>
                <td>
                  <span className="sx-namecell">
                    <SubIcon name={p.subcategory} size={24} />
                    {p.name}
                  </span>
                </td>
                <td>{p.subcategory ?? "—"}</td>
                <td className="num">{p.count}</td>
                <td className="num">{p.unit ? formatQuantity(p.quantity, p.unit) : "—"}</td>
                <td className="num strong">{formatMoney(p.total)}</td>
                <td className="num">{p.unit && p.unitPrice != null ? formatUnitPrice(p.unitPrice, p.unit) : "—"}</td>
                <td>{p.lastDate.split("-").reverse().join("/")}</td>
                <td className="muted">{p.stores.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!list.length && <p className="sx-empty">Aucun produit.</p>}
    </section>
  );
}

export function MerchantsPanel({ data, query }: { data: Data; query: string }) {
  const list = data.merchants.filter((m) => matches(m.store, query));
  return (
    <div className="sx-two wide-left">
      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Marchands ce mois-ci ({list.length})</h2>
        </div>
        <div className="table-wrap">
          <table className="sx-table">
            <thead>
              <tr>
                <th>Marchand</th>
                <th className="num">Passages</th>
                <th className="num">Articles</th>
                <th className="num">Panier moyen</th>
                <th className="num">Part</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.store}>
                  <td>
                    <span className="sx-namecell">
                      <MerchantLogo store={m.store} />
                      {m.store}
                    </span>
                  </td>
                  <td className="num">{m.visits}</td>
                  <td className="num">{m.items}</td>
                  <td className="num">{formatMoney(m.visits ? m.total / m.visits : 0)}</td>
                  <td className="num">{m.share} %</td>
                  <td className="num strong">{formatMoney(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && <p className="sx-empty">Aucun marchand.</p>}
      </section>
      <MerchantsCard data={data} />
    </div>
  );
}

export function PeoplePanel({ data }: { data: Data }) {
  if (!data.persons.length) return <p className="sx-empty">Aucun achat ce mois-ci.</p>;
  return (
    <div className="sx-people">
      {data.persons.map((p, i) => (
        <section key={p.person} className="card sx-person">
          <span className="sx-person-badge" style={{ background: MERCHANT_PALETTE[i % MERCHANT_PALETTE.length] }}>
            {(PERSON_LABEL[p.person] ?? p.person).replace(/^(Ma |Mon )/, "").charAt(0).toUpperCase()}
          </span>
          <div>
            <h3>{PERSON_LABEL[p.person] ?? p.person}</h3>
            <strong>{formatMoney(p.total)}</strong>
            <i className="sx-bar">
              <b style={{ width: `${p.share}%`, background: MERCHANT_PALETTE[i % MERCHANT_PALETTE.length] }} />
            </i>
            <p>
              {p.share} % du total · {p.visits} passage{p.visits > 1 ? "s" : ""} · {p.items} articles
            </p>
            {p.topSub && <p className="muted">Achète surtout : {p.topSub}</p>}
          </div>
        </section>
      ))}
    </div>
  );
}

export function HoursPanel({ data }: { data: Data }) {
  const grid = data.heatmap.half;
  const byDay = grid.map((row) => row.reduce((s, v) => s + v, 0));
  const slots = [
    { label: "Matin (6h–11h)", from: 0, to: 5 },
    { label: "Midi (12h–13h)", from: 6, to: 7 },
    { label: "Après-midi (14h–16h)", from: 8, to: 10 },
    { label: "Soir (17h–21h)", from: 11, to: 15 },
  ].map((slot) => ({
    ...slot,
    count: grid.reduce((s, row) => s + row.slice(slot.from, slot.to + 1).reduce((a, b) => a + b, 0), 0),
  }));
  const totalVisits = byDay.reduce((s, v) => s + v, 0);
  let best = { d: 0, h: 0, v: 0 };
  grid.forEach((row, d) =>
    row.forEach((v, h) => {
      if (v > best.v) best = { d, h, v };
    }),
  );
  const maxDay = Math.max(1, ...byDay);
  const maxSlot = Math.max(1, ...slots.map((s) => s.count));
  return (
    <div className="sx-two">
      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Moments d’achat · 6 derniers mois</h2>
        </div>
        <Heatmap grid={grid} />
        {totalVisits > 0 && (
          <p className="sx-note">
            Moment le plus fréquent : <b>{DAYS[best.d].toLowerCase()}. vers {best.h + 6}h</b> ({best.v} passage
            {best.v > 1 ? "s" : ""} sur {totalVisits}).
          </p>
        )}
      </section>
      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Par jour et par moment</h2>
        </div>
        <ul className="sx-bars">
          {byDay.map((v, d) => (
            <li key={DAYS[d]}>
              <span>{DAYS[d]}</span>
              <i>
                <b style={{ width: `${(v / maxDay) * 100}%` }} />
              </i>
              <em>{v}</em>
            </li>
          ))}
        </ul>
        <ul className="sx-bars slots">
          {slots.map((s) => (
            <li key={s.label}>
              <span>{s.label}</span>
              <i>
                <b style={{ width: `${(s.count / maxSlot) * 100}%` }} />
              </i>
              <em>{s.count}</em>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function TrendPanel({ data }: { data: Data }) {
  const subs = data.subcategories.filter((s) => s.trend.amount.some((v) => v > 0));
  const colors = new Map(subs.map((s, i) => [s.name, SUB_PALETTE[i % SUB_PALETTE.length]]));
  const series = data.months.map((monthKey, i) => ({
    monthKey,
    total: subs.reduce((s, sub) => s + sub.trend.amount[i], 0),
    byCategory: subs.map((sub) => ({ category: sub.name, total: sub.trend.amount[i], color: colors.get(sub.name)! })),
  }));
  return (
    <div className="sx-stack">
      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Évolution par sous-catégorie</h2>
        </div>
        <EvolutionChart series={series} categoryNames={subs.map((s) => s.name)} mode="category" />
        <div className="sx-legend">
          {subs.map((s) => (
            <span key={s.id}>
              <i style={{ background: colors.get(s.name) }} />
              {s.name}
            </span>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="table-wrap">
          <table className="sx-table">
            <thead>
              <tr>
                <th>Sous-catégorie</th>
                {data.months.map((m) => (
                  <th key={m} className="num">
                    {monthName(m).slice(0, 4)}.
                  </th>
                ))}
                <th className="num">vs mois dernier</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="sx-namecell">
                      <SubIcon name={s.name} size={22} />
                      {s.name}
                    </span>
                  </td>
                  {s.trend.amount.map((v, i) => (
                    <td key={data.months[i]} className="num">
                      {v ? formatMoney(v) : "—"}
                    </td>
                  ))}
                  <td className="num">
                    <DeltaTag pct={s.deltaPct} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function ComparisonPanel({ data, query }: { data: Data; query: string }) {
  const list = useMemo(() => data.prices.filter((p) => matches(p.name, query)), [data.prices, query]);
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Historique des prix ({list.length} produits)</h2>
      </div>
      <div className="table-wrap">
        <table className="sx-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th className="num">Ce mois</th>
              <th className="num">Moy. 3 mois avant</th>
              <th className="num">Variation</th>
              <th className="num">Min – max (6 mois)</th>
              <th>Moins cher chez</th>
              <th>6 mois</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.key}>
                <td>
                  <span className="sx-namecell">
                    {p.name} <em className="muted">({p.unit})</em>
                  </span>
                </td>
                <td className="num strong">{p.unitPrice != null ? formatUnitPrice(p.unitPrice, p.unit) : "—"}</td>
                <td className="num">{p.averageBefore != null ? formatUnitPrice(p.averageBefore, p.unit) : "—"}</td>
                <td className="num">
                  <DeltaTag pct={p.deltaPct} />
                </td>
                <td className="num muted">
                  {p.min != null && p.max != null ? `${p.min.toFixed(2)} – ${p.max.toFixed(2)} $` : "—"}
                </td>
                <td>
                  {p.stores[0] ? (
                    <span className="sx-namecell">
                      <MerchantLogo store={p.stores[0].store} />
                      {p.stores[0].store} · {formatUnitPrice(p.stores[0].unitPrice, p.unit)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <Sparkline values={p.history.map((h) => h ?? 0)} color={(p.deltaPct ?? 0) > 0 ? "#f43f5e" : "#22c55e"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!list.length && <p className="sx-empty">Aucun produit avec quantité enregistrée.</p>}
    </section>
  );
}
