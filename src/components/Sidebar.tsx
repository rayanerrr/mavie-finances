"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconBudget, IconChart, IconCloud, IconFlag, IconHome, IconList, IconPlusCircle, IconReceipt, IconReport, IconSettings, IconTag, IconWallet, IconCalendar } from "./icons";
import { useResource } from "./ui";
const groups = [
  { label: "Au quotidien", items: [["/", "Accueil", IconHome], ["/transactions", "Transactions", IconList], ["/ajouter", "Ajouter un reçu", IconPlusCircle], ["/recus", "Reçus à vérifier", IconReceipt], ["/depenses-fixes", "Dépenses fixes", IconCalendar]] },
  { label: "Planifier", items: [["/budgets", "Budgets", IconBudget], ["/objectifs", "Objectifs", IconFlag]] },
  { label: "Comprendre", items: [["/analyses", "Analyses", IconChart], ["/rapports", "Rapports", IconReport]] },
  { label: "Réglages", items: [["/categories", "Catégories", IconTag], ["/comptes", "Comptes", IconWallet], ["/parametres", "Paramètres", IconSettings]] },
] as const;
export type InboxStatus = { enabled: boolean; dir: string; exists: boolean; waitingFiles: number; lastError: string | null; lastScanAt: string | null };
export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const inbox = useResource<InboxStatus>("/api/inbox/status", 20000);
  const queue = useResource<{ receipts: { status: string }[] }>("/api/receipts", 20000);
  const count = queue.data?.receipts.filter(r => r.status !== "confirmed").length;
  return <aside className="sidebar"><div className="mac-drag" aria-hidden="true"/><div className="brand"><Image src="/logo.svg" width={44} height={36} alt="TWR"/><div><strong>MaVie</strong><span>Finances du foyer</span></div><button className="btn nav-toggle" aria-expanded={open} aria-controls="navigation" onClick={() => setOpen(!open)}>Menu</button></div>
    <nav id="navigation" aria-label="Navigation principale" className={`side-nav ${open ? "open" : ""}`}>{groups.map(g => <div key={g.label} className="nav-group"><p>{g.label}</p>{g.items.map(([href, label, Icon]) => {
      const active = href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/categories" && pathname === "/sous-categories");
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`nav-item ${active ? "active" : ""}`} onClick={() => setOpen(false)}><Icon size={18}/><span>{label}</span>{href === "/recus" && count !== undefined && count > 0 && <span className="count">{count}</span>}</Link>;
    })}</div>)}</nav>
    <Link href="/parametres" className="side-footer"><IconCloud size={20}/><div><strong>iPhone et iCloud</strong><span>{inbox.error ? "État indisponible" : !inbox.data ? "Vérification…" : !inbox.data.enabled ? "Synchronisation en pause" : inbox.data.lastError || !inbox.data.exists ? "À vérifier dans Paramètres" : `${inbox.data.waitingFiles} fichier(s) en attente`}</span></div></Link>
  </aside>;
}
