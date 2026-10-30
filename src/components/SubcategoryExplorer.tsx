"use client";
/* eslint-disable react-hooks/set-state-in-effect -- chargement des données au montage */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CategoryIcon,
  IconArrowUpRight,
  IconArrowDown,
  IconBox,
  IconBulb,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconGrid,
  IconInfo,
  IconLayers,
  IconMore,
  IconPlus,
  IconReceipt,
  IconScale,
  IconSearch,
  IconStore,
  IconTrendUp,
  IconUsers,
  IconWallet,
} from "@/components/icons";
import {
  ComparisonPanel,
  DeltaTag,
  HoursPanel,
  MerchantsCard,
  MerchantsPanel,
  MomentsCard,
  OverviewPanel,
  PeoplePanel,
  ProductsPanel,
  Sparkline,
  SubIcon,
  SUB_PALETTE,
  TopProductsCard,
  TrendPanel,
  matches,
  metricValue,
  type Data,
  type Metric,
} from "@/components/subcategory-panels";
import { formatMoney, monthName, monthTitle, nextMonthKey, previousMonthKey } from "@/lib/money";
import { subcategoryIcon } from "@/lib/sub-icons";
import { formatQuantity, formatUnitPrice } from "@/lib/units";

type Tab = "overview" | "subs" | "products" | "merchants" | "people" | "hours" | "trend" | "compare";

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "Vue d’ensemble", icon: <IconGrid size={14} /> },
  { id: "subs", label: "Sous-catégories", icon: <IconLayers size={14} /> },
  { id: "products", label: "Produits", icon: <IconBox size={14} /> },
  { id: "merchants", label: "Marchands", icon: <IconStore size={14} /> },
  { id: "people", label: "Personnes", icon: <IconUsers size={14} /> },
  { id: "hours", label: "Heures", icon: <IconClock size={14} /> },
  { id: "trend", label: "Tendance", icon: <IconTrendUp size={14} /> },
  { id: "compare", label: "Comparaison", icon: <IconScale size={14} /> },
];

const METRICS: Array<{ id: Metric; label: string }> = [
  { id: "amount", label: "Montant" },
  { id: "quantity", label: "Quantité" },
  { id: "frequency", label: "Fréquence" },
  { id: "unitPrice", label: "Prix moyen" },
];

const INSIGHT_STYLE = {
  bad: { cls: "bad", icon: <IconArrowUpRight size={16} />, tab: "trend" as Tab },
  good: { cls: "good", icon: <IconArrowDown size={16} />, tab: "trend" as Tab },
  tip: { cls: "tip", icon: <IconBulb size={16} />, tab: "compare" as Tab },
  info: { cls: "info", icon: <IconInfo size={16} />, tab: "compare" as Tab },
};

type CategoryOption = { id: number; name: string; kind: string; archived?: number };

function useClickAway(onAway: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onAway();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onAway]);
  return ref;
}

function Banner({ data }: { data: Data }) {
  const emojis = data.subcategories
    .map((s) => subcategoryIcon(s.name))
    .filter((e): e is string => !!e)
    .slice(0, 8);
  const fallback = emojis.length ? emojis : ["•"];
  return (
    <div
      className="sx-banner"
      style={{ background: `linear-gradient(100deg, var(--card) 0%, ${data.category.color}33 45%, ${data.category.color}22 100%)` }}
      aria-hidden
    >
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} style={{ left: `${8 + i * 9.5}%`, top: `${i % 2 ? 52 : 14}%`, transform: `rotate(${(i % 3) * 12 - 12}deg)` }}>
          {fallback[i % fallback.length]}
        </span>
      ))}
    </div>
  );
}

export function SubcategoryExplorer({
  initialCategoryId,
  initialMonth,
}: {
  initialCategoryId: number | null;
  initialMonth: string;
}) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(initialCategoryId);
  const [month, setMonth] = useState(initialMonth);
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("subs");
  const [metric, setMetric] = useState<Metric>("amount");
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<"category" | number | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const menuRef = useClickAway(closeMenu);

  const flash = useCallback((text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) return;
      const json = (await res.json()) as { categories: CategoryOption[] };
      const active = json.categories.filter((c) => !c.archived && c.kind !== "income");
      setCategories(active);
      setCategoryId((current) => current ?? active.find((c) => c.name === "Alimentation")?.id ?? active[0]?.id ?? null);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!categoryId) return;
    const res = await fetch(`/api/subcategories/analytics?categoryId=${categoryId}&month=${month}`);
    if (res.ok) setData(await res.json());
  }, [categoryId, month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!categoryId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("categoryId", String(categoryId));
    url.searchParams.set("month", month);
    window.history.replaceState(null, "", url);
  }, [categoryId, month]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.subcategories
      .map((s, i) => ({ ...s, color: SUB_PALETTE[i % SUB_PALETTE.length] }))
      .filter((s) => matches(s.name, query) || data.products.month.some((p) => p.subcategory === s.name && matches(p.name, query)))
      .sort((a, b) => metricValue(b, metric) - metricValue(a, metric));
  }, [data, metric, query]);

  async function send(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      flash(json.error ?? "Action impossible.", true);
      return null;
    }
    return json;
  }

  async function addSub() {
    if (!categoryId || !adding?.trim()) return;
    const json = await send("/api/categories", "POST", { categoryId, subcategory: adding.trim() });
    if (!json) return;
    setAdding(null);
    await load();
    flash(`Sous-catégorie « ${json.subcategory.name} » ajoutée.`);
  }

  async function saveRename() {
    if (!renaming?.name.trim()) return;
    const json = await send(`/api/subcategories/${renaming.id}`, "PATCH", { name: renaming.name });
    if (!json) return;
    setRenaming(null);
    await load();
  }

  async function removeSub(id: number, name: string) {
    if (!window.confirm(`Supprimer « ${name} » ? Ses achats resteront dans la catégorie, sans sous-catégorie.`)) return;
    if (await send(`/api/subcategories/${id}`, "DELETE")) {
      await load();
      flash(`« ${name} » supprimée.`);
    }
  }

  const k = data?.kpis;
  const insights = data?.insights ?? [];
  const priceAlerts = (data?.prices ?? [])
    .filter((p) => p.deltaPct != null)
    .sort((a, b) => Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0))
    .slice(0, 5);
  const productSub = (key: string) => data?.products.half.find((p) => p.key === key)?.subcategory ?? null;

  return (
    <div className="sx">
      <header className="sx-head">
        <div>
          <h1>Sous-catégories</h1>
          <p>Analysez vos achats en détail pour mieux comprendre et identifier des économies.</p>
        </div>
        <div className="sx-head-tools">
          <div className="month-nav">
            <button type="button" aria-label="Mois précédent" onClick={() => setMonth(previousMonthKey(month))}>
              <IconChevronLeft size={15} />
            </button>
            <span>
              <IconCalendar size={14} /> {monthTitle(month)}
            </span>
            <button type="button" aria-label="Mois suivant" onClick={() => setMonth(nextMonthKey(month))}>
              <IconChevronRight size={15} />
            </button>
          </div>
          <label className="search sx-search">
            <IconSearch size={15} />
            <input
              placeholder="Rechercher une sous-catégorie, un produit…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
      </header>

      {data && k && (
        <>
          <section className="card sx-hero">
            <span className="sx-hero-tile" style={{ background: data.category.color }}>
              <CategoryIcon icon={data.category.icon} size={30} />
            </span>
            <div className="sx-hero-name">
              <h2>{data.category.name}</h2>
              <p>
                {k.subCount} sous-catégories • {k.transactions} transactions
              </p>
            </div>
            <div className="sx-hero-total">
              <strong>
                {formatMoney(k.total)} <DeltaTag pct={k.totalDelta} />
              </strong>
              <p>
                vs. {monthName(previousMonthKey(month))} ({formatMoney(k.prevTotal)})
              </p>
            </div>
            <Banner data={data} />
            <div className="sx-hero-actions" ref={menu === "category" ? menuRef : undefined}>
              <Link className="sx-btn" href={`/categories?id=${data.category.id}`}>
                Modifier la catégorie
              </Link>
              <button type="button" className="sx-btn icon" aria-label="Changer de catégorie" onClick={() => setMenu(menu === "category" ? null : "category")}>
                <IconMore size={16} />
              </button>
              {menu === "category" && (
                <div className="cm-menu sx-cat-menu">
                  <small>Changer de catégorie</small>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={c.id === categoryId ? "active" : ""}
                      onClick={() => {
                        setCategoryId(c.id);
                        setMenu(null);
                        setQuery("");
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <nav className="sx-tabs">
            {TABS.map((t) => (
              <button key={t.id} type="button" className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          <div className="sx-body">
            <div className="sx-main">
              <section className="sx-kpis">
                <div className="card sx-kpi">
                  <span className="sx-kpi-icon" style={{ background: `${data.category.color}26`, color: data.category.color }}>
                    <CategoryIcon icon={data.category.icon} size={18} />
                  </span>
                  <div>
                    <strong>
                      {formatMoney(k.total)} <DeltaTag pct={k.totalDelta} />
                    </strong>
                    <span>Total ce mois-ci</span>
                  </div>
                </div>
                <div className="card sx-kpi">
                  <span className="sx-kpi-icon blue">
                    <IconReceipt size={18} />
                  </span>
                  <div>
                    <strong>
                      {k.transactions} <DeltaTag pct={k.transactionsDelta} inverse />
                    </strong>
                    <span>Transactions</span>
                  </div>
                </div>
                <div className="card sx-kpi">
                  <span className="sx-kpi-icon pink">
                    <IconWallet size={18} />
                  </span>
                  <div>
                    <strong>
                      {formatMoney(k.average)} <DeltaTag pct={k.averageDelta} />
                    </strong>
                    <span>Dépense moyenne</span>
                  </div>
                </div>
                <div className="card sx-kpi">
                  <span className="sx-kpi-icon indigo">
                    <IconLayers size={18} />
                  </span>
                  <div>
                    <strong>{k.subCount}</strong>
                    <span>Sous-catégories</span>
                  </div>
                </div>
                <div className="card sx-kpi" title={k.mainMerchants.join(", ")}>
                  <span className="sx-kpi-icon slate">
                    <IconStore size={18} />
                  </span>
                  <div>
                    <strong>{k.mainMerchants.length}</strong>
                    <span>Marchands principaux</span>
                  </div>
                </div>
              </section>

              {tab === "subs" && (
                <>
                  <section className="card sx-subs">
                    <div className="card-head">
                      <h2 className="card-title">Sous-catégories ({rows.length})</h2>
                      <div className="sx-seg">
                        {METRICS.map((m) => (
                          <button key={m.id} type="button" className={metric === m.id ? "active" : ""} onClick={() => setMetric(m.id)}>
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <button type="button" className="sx-add" onClick={() => setAdding("")}>
                        <IconPlus size={13} /> Ajouter
                      </button>
                    </div>
                    {adding !== null && (
                      <div className="sx-adding">
                        <input
                          className="cm-inline-input"
                          autoFocus
                          placeholder={`Nouvelle sous-catégorie de ${data.category.name}`}
                          value={adding}
                          onChange={(e) => setAdding(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void addSub();
                            if (e.key === "Escape") setAdding(null);
                          }}
                        />
                        <button type="button" className="cm-btn primary" onClick={() => void addSub()}>
                          Ajouter
                        </button>
                        <button type="button" className="cm-btn" onClick={() => setAdding(null)}>
                          Annuler
                        </button>
                      </div>
                    )}
                    <div className="table-wrap">
                      <table className="sx-table sx-subtable">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Sous-catégorie</th>
                            <th className={`num ${metric === "amount" ? "sorted" : ""}`}>
                              Montant {metric === "amount" && "↓"}
                            </th>
                            <th className="num">% de la catégorie</th>
                            <th className={`num ${metric === "quantity" ? "sorted" : ""}`}>
                              Quantité {metric === "quantity" && "↓"}
                            </th>
                            <th className={`num ${metric === "frequency" ? "sorted" : ""}`}>
                              Achats {metric === "frequency" && "↓"}
                            </th>
                            <th className={`num ${metric === "unitPrice" ? "sorted" : ""}`}>
                              Prix moyen {metric === "unitPrice" && "↓"}
                            </th>
                            <th>Tendance</th>
                            <th className="center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((s, i) => (
                            <tr key={s.id}>
                              <td className="muted">{i + 1}</td>
                              <td>
                                <span className="sx-namecell">
                                  <SubIcon name={s.name} />
                                  {renaming?.id === s.id ? (
                                    <input
                                      className="cm-inline-input"
                                      autoFocus
                                      value={renaming.name}
                                      onChange={(e) => setRenaming({ id: s.id, name: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") void saveRename();
                                        if (e.key === "Escape") setRenaming(null);
                                      }}
                                      onBlur={() => void saveRename()}
                                    />
                                  ) : (
                                    s.name
                                  )}
                                </span>
                              </td>
                              <td className="num strong" style={{ color: s.total ? s.color : undefined }}>
                                {formatMoney(s.total)}
                              </td>
                              <td className="num">{s.share} %</td>
                              <td className="num">{s.unit ? formatQuantity(s.quantity, s.unit) : "—"}</td>
                              <td className="num">{s.frequency}</td>
                              <td className="num">{s.unit && s.unitPrice != null ? formatUnitPrice(s.unitPrice, s.unit) : "—"}</td>
                              <td>
                                <Sparkline values={s.trend[metric]} color={s.color} />
                              </td>
                              <td className="center">
                                <div className="cm-more-wrap sx-inline" ref={menu === s.id ? menuRef : undefined}>
                                  <button type="button" className="sx-dots" onClick={() => setMenu(menu === s.id ? null : s.id)}>
                                    <IconMore size={15} />
                                  </button>
                                  {menu === s.id && (
                                    <div className="cm-menu">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMenu(null);
                                          setQuery(s.name);
                                          setTab("products");
                                        }}
                                      >
                                        Voir les produits
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMenu(null);
                                          setRenaming({ id: s.id, name: s.name });
                                        }}
                                      >
                                        Renommer
                                      </button>
                                      <button
                                        type="button"
                                        className="danger"
                                        onClick={() => {
                                          setMenu(null);
                                          void removeSub(s.id, s.name);
                                        }}
                                      >
                                        Supprimer
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!rows.length && <p className="sx-empty">Aucune sous-catégorie ne correspond.</p>}
                  </section>

                  <div className="sx-bottom">
                    <TopProductsCard data={data} query={query} />
                    <MerchantsCard data={data} />
                    <MomentsCard data={data} />
                  </div>
                </>
              )}

              {tab === "overview" && <OverviewPanel data={data} />}
              {tab === "products" && <ProductsPanel data={data} query={query} />}
              {tab === "merchants" && <MerchantsPanel data={data} query={query} />}
              {tab === "people" && <PeoplePanel data={data} />}
              {tab === "hours" && <HoursPanel data={data} />}
              {tab === "trend" && <TrendPanel data={data} />}
              {tab === "compare" && <ComparisonPanel data={data} query={query} />}
            </div>

            <aside className="sx-side">
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title">Insights — {data.category.name}</h2>
                  <span className="sx-auto" title="Calculé automatiquement à partir de vos achats">
                    Auto
                  </span>
                </div>
                {insights.length ? (
                  <ul className="sx-insights">
                    {insights.map((ins) => {
                      const style = INSIGHT_STYLE[ins.tone];
                      return (
                        <li key={ins.title}>
                          <button type="button" onClick={() => setTab(style.tab)}>
                            <span className={`sx-ins-icon ${style.cls}`}>{style.icon}</span>
                            <span className="sx-ins-text">
                              <b>{ins.title}</b>
                              <span>{ins.body}</span>
                            </span>
                            <IconChevronRight size={14} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="sx-empty">Pas assez d’achats ce mois-ci pour tirer des conclusions.</p>
                )}
              </section>

              <section className="card">
                <div className="card-head">
                  <h2 className="card-title">
                    Comparaison des prix <small>(3 derniers mois)</small>
                  </h2>
                </div>
                {priceAlerts.length ? (
                  <ul className="sx-prices">
                    {priceAlerts.map((p) => (
                      <li key={p.key}>
                        <SubIcon name={productSub(p.key)} size={24} />
                        <span>
                          {p.name} <em>({p.unit})</em>
                        </span>
                        <strong>{p.unitPrice != null ? formatMoney(p.unitPrice) : "—"}</strong>
                        <DeltaTag pct={p.deltaPct} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="sx-empty">Les prix apparaîtront quand les reçus incluront les quantités.</p>
                )}
                <button type="button" className="sx-history" onClick={() => setTab("compare")}>
                  Voir l’historique des prix
                </button>
              </section>
            </aside>
          </div>
        </>
      )}

      {toast && <div className={`cm-toast ${toast.error ? "error" : ""}`}>{toast.text}</div>}
    </div>
  );
}
