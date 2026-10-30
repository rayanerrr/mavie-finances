"use client";

import Link from "next/link";
import { formatMoneyShort } from "@/lib/money";

export function SoftError({ message, href = "/parametres" }: { message: string; href?: string }) {
  return <div className="notice" role="alert"><span>⚠ {message}</span><Link className="btn" href={href}>Voir Paramètres</Link></div>;
}

export function StateLabel({ state }: { state: "ok" | "warn" | "over"; }) {
  const content = state === "ok" ? "✓ Bien" : state === "warn" ? "! Attention" : "! Dépassé";
  return <span className={`state-label state-${state}`} aria-label={content}>{content}</span>;
}

export type RailItem = { date: string; name: string; amount: number; status?: "paid" | "upcoming"; paid?: boolean };

export function MonthRail({ items = [], month = new Date().toISOString().slice(0, 7) }: { items?: RailItem[]; month?: string }) {
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5)) , 0).getDate();
  const today = new Date();
  const todayPosition = today.getFullYear() === Number(month.slice(0, 4)) && today.getMonth() + 1 === Number(month.slice(5)) ? today.getDate() : null;
  return <section className="month-rail" aria-label={`Rail des dépenses fixes de ${month}`}>
    <div className="rail-track">
      {todayPosition && <div className="rail-today" style={{ left: `${((todayPosition - 1) / Math.max(days - 1, 1)) * 100}%` }}><span>Aujourd’hui</span></div>}
      {items.map((item) => { const day = Number(item.date.slice(-2)); const paid = item.status === "paid" || item.paid; return <Link key={`${item.name}-${item.date}`} href="/depenses-fixes" className={`rail-marker ${paid ? "paid" : "upcoming"}`} style={{ left: `${((day - 1) / Math.max(days - 1, 1)) * 100}%` }} title={`${item.name} · ${formatMoneyShort(item.amount)}`} aria-label={`${item.name}, ${formatMoneyShort(item.amount)}, ${paid ? "payé" : "à venir"}`}><i aria-hidden="true" /></Link>; })}
    </div>
    <div className="rail-labels"><span>1</span><span>15</span><span>{days}</span></div>
  </section>;
}

export function EmptyState({ children }: { children: string }) { return <p className="empty">{children}</p>; }
