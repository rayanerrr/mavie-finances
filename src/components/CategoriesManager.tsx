"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CategoryIcon,
  IconArchive,
  IconCheckCircle,
  IconChevronDown,
  IconGrid,
  IconLayers,
  IconMerge,
  IconMore,
  IconPencil,
  IconPie,
  IconPlus,
  IconRows,
  IconSearch,
  IconTagStack,
  IconDoc,
  IconTrash,
  IconTrendDown,
  IconTrendUp,
  IconX,
} from "@/components/icons";
import { COLOR_CHOICES, ICON_CHOICES, type CategoryIconKey } from "@/lib/classify";
import { currentMonthKey, formatMoney } from "@/lib/money";
import { subcategoryIcon } from "@/lib/sub-icons";

type Kind = "essential" | "discretionary" | "income";

type CategoryRow = {
  id: number;
  name: string;
  color: string;
  kind: Kind;
  icon: CategoryIconKey;
  archived: boolean;
  total: number;
  prevTotal: number;
  deltaPct: number | null;
  txCount: number;
  prevTxCount: number;
  subCount: number;
};

type Overview = {
  categories: CategoryRow[];
  stats: {
    categoryCount: number;
    newCategories: number;
    subCount: number;
    newSubs: number;
    essentialCount: number;
    discretionaryCount: number;
    uncategorized: number;
  };
};

type Detail = {
  subcategories: Array<{ id: number; name: string; total: number; txCount: number }>;
  rules: Array<{ id: number; keyword: string; subcategoryId: number | null; subcategoryName: string | null }>;
};

type SortKey = "spend-desc" | "spend-asc" | "name" | "delta";
type Tab = "overview" | "subs" | "rules";

const KIND_LABEL: Record<Kind, string> = {
  essential: "Essentielle",
  discretionary: "Discrétionnaire",
  income: "Revenu",
};

function pctDiff(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function Delta({ pct, income = false }: { pct: number | null; income?: boolean }) {
  if (pct == null) return <span className="cm-delta flat">nouveau</span>;
  if (pct === 0) return <span className="cm-delta flat">— 0 %</span>;
  const up = pct > 0;
  const good = income ? up : !up;
  return (
    <span className={`cm-delta ${good ? "good" : "bad"}`}>
      {up ? <IconTrendUp size={13} /> : <IconTrendDown size={13} />}
      {up ? "+" : ""}
      {pct} %
    </span>
  );
}

function KindBadge({ kind }: { kind: Kind }) {
  return <span className={`cm-badge ${kind}`}>{KIND_LABEL[kind]}</span>;
}

function Tile({ color, icon, size = 40 }: { color: string; icon: CategoryIconKey; size?: number }) {
  return (
    <span className="cm-tile" style={{ background: color, width: size, height: size }}>
      <CategoryIcon icon={icon} size={Math.round(size * 0.5)} />
    </span>
  );
}

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

function Menu({
  items,
  onClose,
}: {
  items: Array<{ label: string; onClick: () => void; danger?: boolean }>;
  onClose: () => void;
}) {
  const ref = useClickAway(onClose);
  return (
    <div className="cm-menu" ref={ref} onClick={(e) => e.stopPropagation()}>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className={item.danger ? "danger" : ""}
          onClick={() => {
            onClose();
            item.onClick();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function IconPicker({
  value,
  color,
  onChange,
}: {
  value: CategoryIconKey;
  color: string;
  onChange: (icon: CategoryIconKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickAway(close);
  return (
    <div className="cm-iconpick" ref={ref}>
      <button type="button" className="cm-iconpick-btn" onClick={() => setOpen((o) => !o)}>
        <CategoryIcon icon={value} size={16} />
        <IconChevronDown size={14} />
      </button>
      {open && (
        <div className="cm-iconpick-pop">
          {ICON_CHOICES.map((icon) => (
            <button
              key={icon}
              type="button"
              className={icon === value ? "active" : ""}
              style={icon === value ? { background: color } : undefined}
              onClick={() => {
                onChange(icon);
                setOpen(false);
              }}
            >
              <CategoryIcon icon={icon} size={16} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="cm-colors">
      {COLOR_CHOICES.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Couleur ${c}`}
          className={c.toLowerCase() === value.toLowerCase() ? "active" : ""}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

export function CategoriesManager() {
  const month = currentMonthKey();
  const [data, setData] = useState<Overview | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("spend-desc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showArchived, setShowArchived] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const [form, setForm] = useState<{ name: string; kind: Kind; color: string; icon: CategoryIconKey }>({
    name: "",
    kind: "essential",
    color: COLOR_CHOICES[0],
    icon: "cutlery",
  });

  const [cardMenu, setCardMenu] = useState<number | null>(null);
  const [headerMenu, setHeaderMenu] = useState(false);
  const [subMenu, setSubMenu] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [merging, setMerging] = useState<number | "">("");
  const [mergeOpen, setMergeOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [newSub, setNewSub] = useState<string | null>(null);
  const [subRename, setSubRename] = useState<{ id: number; name: string } | null>(null);
  const [rule, setRule] = useState<{ keyword: string; subcategoryId: string }>({
    keyword: "",
    subcategoryId: "",
  });

  const flash = useCallback((text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadOverview = useCallback(async () => {
    const res = await fetch(`/api/categories/overview?month=${month}`);
    if (res.ok) setData(await res.json());
  }, [month]);

  const loadDetail = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/categories/${id}?month=${month}`);
      if (res.ok) setDetail(await res.json());
    },
    [month],
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const visible = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const rows = data.categories.filter(
      (c) => (showArchived ? c.archived : !c.archived) && (!q || c.name.toLowerCase().includes(q)),
    );
    const sorted = [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "fr");
      if (sort === "spend-asc") return a.total - b.total;
      if (sort === "delta") return (b.deltaPct ?? 999) - (a.deltaPct ?? 999);
      return b.total - a.total;
    });
    if (sort === "name") return sorted;
    return [...sorted.filter((c) => c.kind !== "income"), ...sorted.filter((c) => c.kind === "income")];
  }, [data, query, sort, showArchived]);

  const activeId = useMemo(() => {
    if (!data) return null;
    if (selectedId && data.categories.some((c) => c.id === selectedId)) return selectedId;
    return (visible.find((c) => c.name === "Alimentation") ?? visible[0])?.id ?? null;
  }, [data, selectedId, visible]);

  const selected = data?.categories.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    if (activeId) void loadDetail(activeId);
  }, [activeId, loadDetail]);

  function select(id: number) {
    setSelectedId(id);
    setPanelOpen(true);
    setTab("overview");
    setRenaming(null);
    setMergeOpen(false);
    setAppearanceOpen(false);
    setNewSub(null);
    setSubRename(null);
  }

  async function refresh() {
    await loadOverview();
    if (activeId) await loadDetail(activeId);
  }

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

  async function addCategory() {
    const name = form.name.trim();
    if (!name) {
      flash("Donnez un nom à la catégorie.", true);
      return;
    }
    if (data?.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      flash(`« ${name} » existe déjà.`, true);
      return;
    }
    const json = await send("/api/categories", "POST", form);
    if (!json) return;
    setForm((f) => ({ ...f, name: "" }));
    await loadOverview();
    select(json.category.id);
    flash(`Catégorie « ${name} » ajoutée.`);
  }

  async function patchCategory(id: number, patch: Record<string, unknown>, message?: string) {
    const json = await send(`/api/categories/${id}`, "PATCH", patch);
    if (!json) return false;
    await refresh();
    if (message) flash(message);
    return true;
  }

  async function removeCategory(cat: CategoryRow) {
    const warning =
      cat.txCount > 0 || cat.prevTotal > 0
        ? `Supprimer « ${cat.name} » ? Ses transactions seront déplacées dans « Autres ».`
        : `Supprimer « ${cat.name} » ?`;
    if (!window.confirm(warning)) return;
    const json = await send(`/api/categories/${cat.id}`, "DELETE");
    if (!json) return;
    setSelectedId(null);
    await loadOverview();
    flash(json.movedTo ? `Supprimée — transactions déplacées dans « ${json.movedTo} ».` : "Catégorie supprimée.");
  }

  async function mergeInto() {
    if (!selected || merging === "") return;
    const target = data?.categories.find((c) => c.id === merging);
    if (!target) return;
    if (!window.confirm(`Fusionner « ${selected.name} » dans « ${target.name} » ? Cette action est définitive.`)) {
      return;
    }
    const json = await send(`/api/categories/${selected.id}/merge`, "POST", { targetId: merging });
    if (!json) return;
    setMergeOpen(false);
    setMerging("");
    setSelectedId(target.id);
    await loadOverview();
    flash(`« ${selected.name} » fusionnée dans « ${target.name} ».`);
  }

  async function addSubcategory() {
    if (!selected || !newSub?.trim()) return;
    const json = await send("/api/categories", "POST", {
      categoryId: selected.id,
      subcategory: newSub.trim(),
    });
    if (!json) return;
    setNewSub(null);
    await refresh();
    flash(`Sous-catégorie « ${json.subcategory.name} » ajoutée.`);
  }

  async function saveSubRename() {
    if (!subRename?.name.trim()) return;
    const json = await send(`/api/subcategories/${subRename.id}`, "PATCH", { name: subRename.name });
    if (!json) return;
    setSubRename(null);
    await refresh();
  }

  async function removeSub(id: number, name: string) {
    if (!window.confirm(`Supprimer « ${name} » ? Ses transactions resteront dans la catégorie, sans sous-catégorie.`)) {
      return;
    }
    if (await send(`/api/subcategories/${id}`, "DELETE")) await refresh();
  }

  async function addRule() {
    if (!selected || !rule.keyword.trim()) return;
    const json = await send(`/api/categories/${selected.id}/rules`, "POST", {
      keyword: rule.keyword,
      subcategoryId: rule.subcategoryId ? Number(rule.subcategoryId) : null,
    });
    if (!json) return;
    setRule({ keyword: "", subcategoryId: "" });
    await refresh();
  }

  async function removeRule(ruleId: number) {
    if (!selected) return;
    if (await send(`/api/categories/${selected.id}/rules?ruleId=${ruleId}`, "DELETE")) await refresh();
  }

  const stats = data?.stats;
  const kindTotal = stats ? stats.essentialCount + stats.discretionaryCount : 0;
  const essentialPct = kindTotal ? Math.round((stats!.essentialCount / kindTotal) * 100) : 0;
  const subs = detail?.subcategories ?? [];
  const categoryTotal = subs.reduce((s, x) => s + x.total, 0);
  const closeCardMenu = useCallback(() => setCardMenu(null), []);
  const closeHeaderMenu = useCallback(() => setHeaderMenu(false), []);
  const closeSubMenu = useCallback(() => setSubMenu(null), []);

  function cardMenuItems(cat: CategoryRow) {
    return [
      { label: "Voir le détail", onClick: () => select(cat.id) },
      {
        label: "Renommer",
        onClick: () => {
          select(cat.id);
          setRenaming(cat.name);
        },
      },
      {
        label: "Modifier couleur et icône",
        onClick: () => {
          select(cat.id);
          setAppearanceOpen(true);
        },
      },
      {
        label: cat.archived ? "Désarchiver" : "Archiver",
        onClick: () =>
          void patchCategory(cat.id, { archived: !cat.archived }, cat.archived ? "Catégorie restaurée." : "Catégorie archivée."),
      },
      { label: "Supprimer", danger: true, onClick: () => void removeCategory(cat) },
    ];
  }

  function renderSubRow(sub: Detail["subcategories"][number], showShare: boolean) {
    const emoji = subcategoryIcon(sub.name);
    const share = categoryTotal > 0 ? Math.round((sub.total / categoryTotal) * 100) : 0;
    const isRenaming = subRename?.id === sub.id;
    return (
      <li key={sub.id} className="cm-sub">
        <span className="cm-sub-icon">
          {emoji ?? <b style={{ color: selected?.color }}>{sub.name.charAt(0)}</b>}
        </span>
        {isRenaming ? (
          <input
            className="cm-inline-input"
            autoFocus
            value={subRename.name}
            onChange={(e) => setSubRename({ id: sub.id, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveSubRename();
              if (e.key === "Escape") setSubRename(null);
            }}
            onBlur={() => void saveSubRename()}
          />
        ) : (
          <span className="cm-sub-name">{sub.name}</span>
        )}
        {showShare ? (
          <span className="cm-sub-share">
            <i>
              <b style={{ width: `${share}%`, background: selected?.color }} />
            </i>
            {share} %
          </span>
        ) : (
          <>
            <span className="cm-sub-amount">{formatMoney(sub.total)}</span>
            <span className="cm-sub-count">
              {sub.txCount} transaction{sub.txCount > 1 ? "s" : ""}
            </span>
          </>
        )}
        <span className="cm-more-wrap">
          <button type="button" className="cm-more" onClick={() => setSubMenu(subMenu === sub.id ? null : sub.id)}>
            <IconMore size={15} />
          </button>
          {subMenu === sub.id && (
            <Menu
              onClose={closeSubMenu}
              items={[
                { label: "Renommer", onClick: () => setSubRename({ id: sub.id, name: sub.name }) },
                {
                  label: "Créer une règle",
                  onClick: () => {
                    setTab("rules");
                    setRule({ keyword: "", subcategoryId: String(sub.id) });
                  },
                },
                { label: "Supprimer", danger: true, onClick: () => void removeSub(sub.id, sub.name) },
              ]}
            />
          )}
        </span>
      </li>
    );
  }

  const addSubRow =
    newSub !== null ? (
      <div className="cm-add-sub">
        <input
          className="cm-inline-input"
          autoFocus
          placeholder="Nom de la sous-catégorie"
          value={newSub}
          onChange={(e) => setNewSub(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void addSubcategory();
            if (e.key === "Escape") setNewSub(null);
          }}
        />
        <button type="button" className="cm-btn primary" onClick={() => void addSubcategory()}>
          Ajouter
        </button>
        <button type="button" className="cm-btn" onClick={() => setNewSub(null)}>
          Annuler
        </button>
      </div>
    ) : null;

  return (
    <div className="cm">
      <header className="cm-head">
        <div>
          <h1>Catégories</h1>
          <p>Organisez vos catégories et sous-catégories pour mieux suivre vos dépenses.</p>
        </div>
        <label className="search cm-search">
          <IconSearch size={15} />
          <input
            placeholder="Rechercher une catégorie…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </header>

      <section className="card cm-create">
        <div className="cm-create-intro">
          <h2>Ajouter une nouvelle catégorie</h2>
          <p>Créez une catégorie pour organiser vos dépenses.</p>
        </div>
        <label className="cm-field cm-field-name">
          <span>Nom de la catégorie</span>
          <input
            placeholder="Ex. Voyages"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && void addCategory()}
          />
        </label>
        <label className="cm-field">
          <span>Type</span>
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Kind })}>
            <option value="essential">Essentielle</option>
            <option value="discretionary">Discrétionnaire</option>
            <option value="income">Revenu</option>
          </select>
        </label>
        <div className="cm-field">
          <span>Couleur</span>
          <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
        </div>
        <div className="cm-field">
          <span>Icône</span>
          <IconPicker value={form.icon} color={form.color} onChange={(icon) => setForm({ ...form, icon })} />
        </div>
        <button type="button" className="cm-add-btn" onClick={() => void addCategory()}>
          Ajouter
        </button>
      </section>

      {stats && (
        <section className="cm-stats">
          <div className="card cm-stat">
            <span className="cm-stat-icon green">
              <IconTagStack size={20} />
            </span>
            <div>
              <strong>{stats.categoryCount}</strong>
              <span>Catégories</span>
              <em>+{stats.newCategories} ce mois-ci</em>
            </div>
          </div>
          <div className="card cm-stat">
            <span className="cm-stat-icon blue">
              <IconLayers size={20} />
            </span>
            <div>
              <strong>{stats.subCount}</strong>
              <span>Sous-catégories</span>
              <em>+{stats.newSubs} ce mois-ci</em>
            </div>
          </div>
          <div className="card cm-stat cm-stat-split">
            <span className="cm-stat-icon purple">
              <IconPie size={20} />
            </span>
            <div>
              <p>
                <strong>{stats.essentialCount}</strong> essentielles
              </p>
              <p>
                <strong>{stats.discretionaryCount}</strong> discrétionnaires
              </p>
              <i className="cm-split">
                <b style={{ width: `${essentialPct}%` }} />
              </i>
              <span className="cm-split-legend">
                <small>{essentialPct} %</small>
                <small>{100 - essentialPct} %</small>
              </span>
            </div>
          </div>
          <div className="card cm-stat">
            <span className="cm-stat-icon pink">
              <IconDoc size={20} />
            </span>
            <div>
              <strong>{stats.uncategorized}</strong>
              <span className="cm-stat-inline">
                Transactions non catégorisées
                {stats.uncategorized === 0 && (
                  <b className="cm-ok">
                    <IconCheckCircle size={14} />
                  </b>
                )}
              </span>
              <em>
                {stats.uncategorized === 0
                  ? "Tout est bien classé !"
                  : "Envoyez-les à Cursor pour les classer."}
              </em>
            </div>
          </div>
        </section>
      )}

      <div className={`cm-body ${panelOpen && selected ? "with-panel" : ""}`}>
        <section className="cm-list">
          <div className="cm-list-head">
            <h2>
              {showArchived ? "Catégories archivées" : "Toutes les catégories"} ({visible.length})
            </h2>
            <button type="button" className="cm-link" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Voir les actives" : "Archivées"}
            </button>
            <span className="cm-sort">
              Trier par
              <select className="mini-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="spend-desc">Dépenses (décroissantes)</option>
                <option value="spend-asc">Dépenses (croissantes)</option>
                <option value="name">Nom (A → Z)</option>
                <option value="delta">Variation (hausse d’abord)</option>
              </select>
            </span>
            <span className="cm-view">
              <button
                type="button"
                aria-label="Vue grille"
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
              >
                <IconGrid size={15} />
              </button>
              <button
                type="button"
                aria-label="Vue liste"
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
              >
                <IconRows size={15} />
              </button>
            </span>
          </div>

          {data && visible.length === 0 && (
            <p className="cm-empty">
              {showArchived ? "Aucune catégorie archivée." : "Aucune catégorie ne correspond à la recherche."}
            </p>
          )}

          {view === "grid" ? (
            <div className="cm-grid">
              {visible.map((cat) => (
                <article
                  key={cat.id}
                  className={`cm-card ${cat.id === activeId && panelOpen ? "selected" : ""}`}
                  onClick={() => select(cat.id)}
                >
                  <div className="cm-card-top">
                    <Tile color={cat.color} icon={cat.icon} />
                    <div className="cm-card-title">
                      <strong>{cat.name}</strong>
                      <KindBadge kind={cat.kind} />
                    </div>
                    <span className="cm-more-wrap">
                      <button
                        type="button"
                        className="cm-more"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardMenu(cardMenu === cat.id ? null : cat.id);
                        }}
                      >
                        <IconMore size={16} />
                      </button>
                      {cardMenu === cat.id && <Menu onClose={closeCardMenu} items={cardMenuItems(cat)} />}
                    </span>
                  </div>
                  <div className="cm-card-amount">
                    <strong>{formatMoney(cat.total)}</strong>
                    <Delta pct={cat.deltaPct} income={cat.kind === "income"} />
                  </div>
                  <span className="cm-card-sub">ce mois-ci</span>
                  <div className="cm-card-foot">
                    <span>
                      {cat.subCount} sous-catégorie{cat.subCount > 1 ? "s" : ""}
                    </span>
                    <span>
                      {cat.txCount} transaction{cat.txCount > 1 ? "s" : ""}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="card cm-table">
              {visible.map((cat) => (
                <div
                  key={cat.id}
                  className={`cm-row ${cat.id === activeId && panelOpen ? "selected" : ""}`}
                  onClick={() => select(cat.id)}
                >
                  <Tile color={cat.color} icon={cat.icon} size={30} />
                  <strong className="cm-row-name">{cat.name}</strong>
                  <KindBadge kind={cat.kind} />
                  <span className="cm-row-meta">{cat.subCount} sous-cat.</span>
                  <span className="cm-row-meta">{cat.txCount} trans.</span>
                  <Delta pct={cat.deltaPct} income={cat.kind === "income"} />
                  <strong className="cm-row-amount">{formatMoney(cat.total)}</strong>
                  <span className="cm-more-wrap">
                    <button
                      type="button"
                      className="cm-more"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCardMenu(cardMenu === cat.id ? null : cat.id);
                      }}
                    >
                      <IconMore size={16} />
                    </button>
                    {cardMenu === cat.id && <Menu onClose={closeCardMenu} items={cardMenuItems(cat)} />}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {panelOpen && selected && (
          <aside className="cm-panel">
            <div className="cm-panel-head">
              <Tile color={selected.color} icon={selected.icon} size={44} />
              <div className="cm-panel-title">
                {renaming !== null ? (
                  <input
                    className="cm-inline-input big"
                    autoFocus
                    value={renaming}
                    onChange={(e) => setRenaming(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Escape") setRenaming(null);
                      if (e.key === "Enter" && renaming.trim()) {
                        if (await patchCategory(selected.id, { name: renaming }, "Catégorie renommée.")) {
                          setRenaming(null);
                        }
                      }
                    }}
                  />
                ) : (
                  <strong>{selected.name}</strong>
                )}
                <KindBadge kind={selected.kind} />
              </div>
              <span className="cm-more-wrap">
                <button type="button" className="cm-icon-btn" onClick={() => setHeaderMenu((v) => !v)}>
                  <IconMore size={16} />
                </button>
                {headerMenu && (
                  <Menu
                    onClose={closeHeaderMenu}
                    items={[
                      { label: "Modifier couleur et icône", onClick: () => setAppearanceOpen(true) },
                      { label: "Ajouter une sous-catégorie", onClick: () => setNewSub("") },
                      { label: "Ajouter une règle", onClick: () => setTab("rules") },
                    ]}
                  />
                )}
              </span>
              <button type="button" className="cm-icon-btn" aria-label="Fermer" onClick={() => setPanelOpen(false)}>
                <IconX size={15} />
              </button>
            </div>

            {renaming !== null && (
              <div className="cm-inline-actions">
                <button
                  type="button"
                  className="cm-btn primary"
                  onClick={async () => {
                    if (renaming.trim() && (await patchCategory(selected.id, { name: renaming }, "Catégorie renommée."))) {
                      setRenaming(null);
                    }
                  }}
                >
                  Enregistrer
                </button>
                <button type="button" className="cm-btn" onClick={() => setRenaming(null)}>
                  Annuler
                </button>
              </div>
            )}

            {appearanceOpen && (
              <div className="cm-appearance">
                <div className="cm-field">
                  <span>Couleur</span>
                  <ColorPicker
                    value={selected.color}
                    onChange={(color) => void patchCategory(selected.id, { color })}
                  />
                </div>
                <div className="cm-appearance-row">
                  <div className="cm-field">
                    <span>Icône</span>
                    <IconPicker
                      value={selected.icon}
                      color={selected.color}
                      onChange={(icon) => void patchCategory(selected.id, { icon })}
                    />
                  </div>
                  <label className="cm-field">
                    <span>Type</span>
                    <select
                      value={selected.kind}
                      onChange={(e) => void patchCategory(selected.id, { kind: e.target.value })}
                    >
                      <option value="essential">Essentielle</option>
                      <option value="discretionary">Discrétionnaire</option>
                      <option value="income">Revenu</option>
                    </select>
                  </label>
                  <button type="button" className="cm-btn" onClick={() => setAppearanceOpen(false)}>
                    Terminé
                  </button>
                </div>
              </div>
            )}

            <div className="cm-tabs">
              <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>
                Vue d’ensemble
              </button>
              <button type="button" className={tab === "subs" ? "active" : ""} onClick={() => setTab("subs")}>
                Sous-catégories <b>{subs.length}</b>
              </button>
              <button type="button" className={tab === "rules" ? "active" : ""} onClick={() => setTab("rules")}>
                Règles
              </button>
            </div>

            {tab === "overview" && (
              <>
                <div className="cm-panel-stats">
                  <div>
                    <span>{selected.kind === "income" ? "Revenus ce mois-ci" : "Dépenses ce mois-ci"}</span>
                    <strong>{formatMoney(selected.total)}</strong>
                    <Delta pct={selected.deltaPct} income={selected.kind === "income"} />
                    <small>vs. mois dernier ({formatMoney(selected.prevTotal)})</small>
                  </div>
                  <div>
                    <span>Transactions</span>
                    <strong>{selected.txCount}</strong>
                    <Delta pct={pctDiff(selected.txCount, selected.prevTxCount)} income />
                    <small>vs. mois dernier ({selected.prevTxCount})</small>
                  </div>
                </div>

                <div className="cm-panel-section">
                  <h3>Sous-catégories ({subs.length})</h3>
                  <button type="button" className="cm-btn primary soft" onClick={() => setNewSub("")}>
                    <IconPlus size={13} /> Ajouter une sous-catégorie
                  </button>
                </div>
                {addSubRow}
                {subs.length > 0 ? (
                  <ul className="cm-subs">{subs.map((sub) => renderSubRow(sub, false))}</ul>
                ) : (
                  <p className="cm-empty">Aucune sous-catégorie pour l’instant.</p>
                )}
              </>
            )}

            {tab === "subs" && (
              <>
                <div className="cm-panel-section">
                  <h3>Part de chaque sous-catégorie</h3>
                  <button type="button" className="cm-btn primary soft" onClick={() => setNewSub("")}>
                    <IconPlus size={13} /> Ajouter
                  </button>
                </div>
                {addSubRow}
                {subs.length > 0 ? (
                  <ul className="cm-subs">
                    {[...subs]
                      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
                      .map((sub) => renderSubRow(sub, true))}
                  </ul>
                ) : (
                  <p className="cm-empty">Aucune sous-catégorie pour l’instant.</p>
                )}
              </>
            )}

            {tab === "rules" && (
              <div className="cm-rules">
                <p className="cm-hint">
                  Quand un achat arrive sans catégorie (ou dans « Autres ») et que sa description ou son marchand
                  contient le mot-clé, il est classé ici automatiquement.
                </p>
                <div className="cm-rule-form">
                  <input
                    className="cm-inline-input"
                    placeholder="Mot-clé, ex. kefta"
                    value={rule.keyword}
                    onChange={(e) => setRule({ ...rule, keyword: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && void addRule()}
                  />
                  <select
                    className="mini-select"
                    value={rule.subcategoryId}
                    onChange={(e) => setRule({ ...rule, subcategoryId: e.target.value })}
                  >
                    <option value="">Sans sous-catégorie</option>
                    {subs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="cm-btn primary" onClick={() => void addRule()}>
                    Ajouter
                  </button>
                </div>
                {detail && detail.rules.length > 0 ? (
                  <ul className="cm-rule-list">
                    {detail.rules.map((r) => (
                      <li key={r.id}>
                        <span>
                          Contient <b>« {r.keyword} »</b> → {selected.name}
                          {r.subcategoryName ? ` › ${r.subcategoryName}` : ""}
                        </span>
                        <button type="button" className="cm-icon-btn" aria-label="Supprimer la règle" onClick={() => void removeRule(r.id)}>
                          <IconTrash size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="cm-empty">Aucune règle pour cette catégorie.</p>
                )}
              </div>
            )}

            {mergeOpen && (
              <div className="cm-merge">
                <span>Fusionner « {selected.name} » dans :</span>
                <select
                  className="mini-select"
                  value={merging}
                  onChange={(e) => setMerging(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Choisir une catégorie…</option>
                  {data?.categories
                    .filter((c) => c.id !== selected.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <button type="button" className="cm-btn primary" disabled={merging === ""} onClick={() => void mergeInto()}>
                  Fusionner
                </button>
                <button type="button" className="cm-btn" onClick={() => setMergeOpen(false)}>
                  Annuler
                </button>
              </div>
            )}

            <div className="cm-panel-actions">
              <button type="button" className="cm-btn" onClick={() => setRenaming(selected.name)}>
                <IconPencil size={14} /> Renommer
              </button>
              <button type="button" className="cm-btn" onClick={() => setMergeOpen((v) => !v)}>
                <IconMerge size={14} /> Fusionner
              </button>
              <button
                type="button"
                className="cm-btn"
                onClick={() =>
                  void patchCategory(
                    selected.id,
                    { archived: !selected.archived },
                    selected.archived ? "Catégorie restaurée." : "Catégorie archivée.",
                  )
                }
              >
                <IconArchive size={14} /> {selected.archived ? "Restaurer" : "Archiver"}
              </button>
              <button type="button" className="cm-btn danger" onClick={() => void removeCategory(selected)}>
                <IconTrash size={14} /> Supprimer
              </button>
            </div>
          </aside>
        )}
      </div>

      {toast && <div className={`cm-toast ${toast.error ? "error" : ""}`}>{toast.text}</div>}
    </div>
  );
}
