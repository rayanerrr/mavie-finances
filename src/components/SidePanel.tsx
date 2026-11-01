"use client";

import Link from "next/link";
import { useEffect, useState, type DragEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, RotateCcw, SlidersHorizontal, Star, X } from "lucide-react";
import { formatMoney } from "@/lib/money";

/**
 * Colonne de droite personnalisable de l'accueil : ordre, blocs masqués et favoris,
 * mémorisés sur ce Mac (localStorage). Les blocs sont fournis par le parent
 * (composition-patterns : le parent compose, ce composant ne gère que la disposition).
 */

export type SideBlock = { id: string; title: string; render: () => ReactNode };

type Layout = { order: string[]; hidden: string[]; favorites: string[] };

const STORAGE_KEY = "mavie-panneau-droit";

/** Pages proposées comme favoris. */
export const FAVORITE_PAGES: Array<{ href: string; label: string }> = [
  { href: "/ajouter", label: "Ajouter un achat" },
  { href: "/transactions", label: "Transactions" },
  { href: "/recus", label: "Reçus & scan" },
  { href: "/depenses-fixes", label: "Dépenses fixes" },
  { href: "/budgets", label: "Budgets" },
  { href: "/objectifs", label: "Objectifs" },
  { href: "/analyses", label: "Analyses" },
  { href: "/rapports", label: "Rapports" },
  { href: "/categories", label: "Catégories" },
  { href: "/sous-categories", label: "Sous-catégories" },
  { href: "/comptes", label: "Comptes" },
  { href: "/parametres", label: "Paramètres" },
];

function readLayout(defaults: Layout): Layout {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Layout> | null;
    if (!saved) return defaults;
    return {
      order: Array.isArray(saved.order) ? saved.order : defaults.order,
      hidden: Array.isArray(saved.hidden) ? saved.hidden : defaults.hidden,
      favorites: Array.isArray(saved.favorites) ? saved.favorites : defaults.favorites,
    };
  } catch {
    return defaults;
  }
}

export function SidePanel({
  blocks,
  defaultOrder,
  defaultHidden,
  defaultFavorites,
}: {
  blocks: SideBlock[];
  defaultOrder: string[];
  defaultHidden: string[];
  defaultFavorites: string[];
}) {
  const defaults: Layout = { order: defaultOrder, hidden: defaultHidden, favorites: defaultFavorites };
  const [layout, setLayout] = useState<Layout>(defaults);
  const [editing, setEditing] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture du réglage mémorisé au montage
    setLayout(readLayout(defaults));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seulement au montage
  }, []);

  function save(next: Layout) {
    setLayout(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const known = new Map(blocks.map((b) => [b.id, b]));
  // Ordre mémorisé + nouveaux blocs apparus depuis (ajoutés à la fin, masqués).
  const ordered = [...layout.order.filter((id) => known.has(id)), ...blocks.map((b) => b.id).filter((id) => !layout.order.includes(id))];
  const visible = ordered.filter((id) => !layout.hidden.includes(id) && (layout.order.includes(id) || !defaultHidden.includes(id)));
  const hidden = ordered.filter((id) => !visible.includes(id));

  function move(id: string, delta: number) {
    const list = [...visible];
    const from = list.indexOf(id);
    const to = Math.max(0, Math.min(list.length - 1, from + delta));
    if (from === to) return;
    list.splice(to, 0, ...list.splice(from, 1));
    save({ ...layout, order: [...list, ...hidden] });
  }

  function drop(target: string) {
    if (!dragged || dragged === target) return;
    const list = visible.filter((id) => id !== dragged);
    list.splice(list.indexOf(target), 0, dragged);
    save({ ...layout, order: [...list, ...hidden] });
  }

  function hide(id: string) {
    save({ ...layout, order: [...visible, ...hidden], hidden: [...layout.hidden.filter((h) => h !== id), id] });
  }

  function show(id: string) {
    save({ ...layout, order: [...visible, id, ...hidden.filter((h) => h !== id)], hidden: layout.hidden.filter((h) => h !== id) });
  }

  return (
    <aside className={`dash-side ${editing ? "is-editing" : ""}`} aria-label="Colonne personnalisable">
      <div className="sp-bar">
        <button type="button" className={`sp-toggle ${editing ? "active" : ""}`} onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
          <SlidersHorizontal size={14} aria-hidden />
          {editing ? "Terminé" : "Personnaliser"}
        </button>
      </div>

      {editing && (
        <p className="sp-hint" role="status">
          Glisse les blocs pour les réordonner, ou utilise les flèches. L’œil barré masque un bloc.
        </p>
      )}

      {visible.map((id, index) => {
        const block = known.get(id)!;
        return (
          <div
            key={id}
            className={`sp-block ${dragged === id ? "dragging" : ""} ${over === id && dragged !== id ? "drop-target" : ""}`}
            draggable={editing}
            onDragStart={(event: DragEvent) => {
              setDragged(id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => {
              if (!editing) return;
              event.preventDefault();
              setOver(id);
            }}
            onDragLeave={() => setOver((o) => (o === id ? null : o))}
            onDrop={(event) => {
              event.preventDefault();
              drop(id);
              setDragged(null);
              setOver(null);
            }}
            onDragEnd={() => {
              setDragged(null);
              setOver(null);
            }}
          >
            {editing && (
              <div className="sp-tools">
                <GripVertical size={16} className="sp-grip" aria-hidden />
                <span className="sp-title">{block.title}</span>
                <button type="button" onClick={() => move(id, -1)} disabled={index === 0} aria-label={`Monter « ${block.title} »`}>
                  <ArrowUp size={14} aria-hidden />
                </button>
                <button type="button" onClick={() => move(id, 1)} disabled={index === visible.length - 1} aria-label={`Descendre « ${block.title} »`}>
                  <ArrowDown size={14} aria-hidden />
                </button>
                <button type="button" onClick={() => hide(id)} aria-label={`Masquer « ${block.title} »`}>
                  <EyeOff size={14} aria-hidden />
                </button>
              </div>
            )}
            <div className={editing ? "sp-preview" : undefined}>
              {id === "favorites" ? (
                <FavoritesBlock
                  editing={editing}
                  favorites={layout.favorites}
                  onChange={(favorites) => save({ ...layout, favorites })}
                />
              ) : (
                block.render()
              )}
            </div>
          </div>
        );
      })}

      {editing && (
        <section className="card sp-hidden">
          <h2 className="card-title">Blocs disponibles</h2>
          {hidden.length ? (
            <ul>
              {hidden.map((id) => (
                <li key={id}>
                  <span>{known.get(id)?.title}</span>
                  <button type="button" onClick={() => show(id)}>
                    <Eye size={14} aria-hidden /> Afficher
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Tous les blocs sont affichés.</p>
          )}
          <button type="button" className="sp-reset" onClick={() => save(defaults)}>
            <RotateCcw size={14} aria-hidden /> Réinitialiser la colonne
          </button>
        </section>
      )}
    </aside>
  );
}

/** Bloc « Favoris » : raccourcis vers tes pages préférées. */
function FavoritesBlock({ editing, favorites, onChange }: { editing: boolean; favorites: string[]; onChange: (next: string[]) => void }) {
  const items = favorites.map((href) => FAVORITE_PAGES.find((p) => p.href === href)).filter(Boolean) as typeof FAVORITE_PAGES;
  const available = FAVORITE_PAGES.filter((p) => !favorites.includes(p.href));
  return (
    <section className="card">
      <h2 className="card-title">Favoris</h2>
      {items.length ? (
        <ul className="fav-list">
          {items.map((page, index) => (
            <li key={page.href}>
              <Link href={page.href} className="fav-link">
                <Star size={14} aria-hidden className="fav-star" />
                {page.label}
              </Link>
              {editing && (
                <span className="fav-tools">
                  <button type="button" disabled={index === 0} aria-label={`Monter « ${page.label} »`} onClick={() => { const next = [...favorites]; next.splice(index - 1, 0, ...next.splice(index, 1)); onChange(next); }}>
                    <ArrowUp size={13} aria-hidden />
                  </button>
                  <button type="button" aria-label={`Retirer « ${page.label} » des favoris`} onClick={() => onChange(favorites.filter((f) => f !== page.href))}>
                    <X size={13} aria-hidden />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Aucun favori. Clique sur « Personnaliser » pour en ajouter.</p>
      )}
      {editing && available.length > 0 && (
        <label className="fav-add">
          <Plus size={14} aria-hidden />
          <select value="" aria-label="Ajouter un favori" onChange={(event) => event.target.value && onChange([...favorites, event.target.value])}>
            <option value="">Ajouter un favori…</option>
            {available.map((page) => (
              <option key={page.href} value={page.href}>
                {page.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
}

/** Bloc « Prochaines dépenses fixes ». */
export function UpcomingFixedBlock({ month }: { month: string }) {
  const [items, setItems] = useState<Array<{ recurringId: number; name: string; amount: number; date: string; status: string; type: string }>>([]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/recurring/upcoming?month=${month}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => alive && setItems(j.items ?? []))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [month]);
  const next = items.filter((i) => i.status === "upcoming").slice(0, 5);
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Prochaines dépenses fixes</h2>
        <Link href="/depenses-fixes" className="sp-more">Tout voir</Link>
      </div>
      {next.length ? (
        <ul className="sp-rows">
          {next.map((i) => (
            <li key={`${i.recurringId}-${i.date}`}>
              <span>{new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short" }).format(new Date(`${i.date}T12:00:00`))}</span>
              <strong>{i.name}</strong>
              <span className={i.type === "income" ? "pos" : ""}>{i.type === "income" ? "+" : "−"}{formatMoney(i.amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Rien d’autre de prévu ce mois-ci.</p>
      )}
    </section>
  );
}

/** Bloc « Reçus à vérifier ». */
export function PendingReceiptsBlock() {
  const [items, setItems] = useState<Array<{ id: number; store: string | null; status: string; createdAt: string }>>([]);
  useEffect(() => {
    let alive = true;
    fetch("/api/receipts")
      .then((r) => (r.ok ? r.json() : { receipts: [] }))
      .then((j) => alive && setItems((j.receipts ?? []).filter((r: { status: string }) => r.status !== "confirmed").slice(0, 5)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  const label: Record<string, string> = { analyzed: "À vérifier", error: "Illisible", pending: "En attente", analyzing: "Lecture…" };
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Reçus à vérifier</h2>
        <Link href="/recus" className="sp-more">Tout voir</Link>
      </div>
      {items.length ? (
        <ul className="sp-rows">
          {items.map((r) => (
            <li key={r.id}>
              <Link href={`/recus/${r.id}`}>
                <strong>{r.store ?? `Reçu #${r.id}`}</strong>
              </Link>
              <span className={`sp-status ${r.status}`}>{label[r.status] ?? r.status}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Tout est vérifié.</p>
      )}
    </section>
  );
}
