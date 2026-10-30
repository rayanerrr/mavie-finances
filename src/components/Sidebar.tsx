"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconBars,
  IconBudget,
  IconCalendar,
  IconChart,
  IconCloud,
  IconFlag,
  IconHome,
  IconList,
  IconPlusCircle,
  IconReceipt,
  IconReport,
  IconSettings,
  IconTag,
  IconWallet,
} from "@/components/icons";

const NAV = [
  { href: "/", label: "Tableau de bord", icon: IconHome },
  { href: "/transactions", label: "Transactions", icon: IconList },
  { href: "/ajouter", label: "Ajouter un achat", icon: IconPlusCircle },
  { href: "/recus", label: "Reçus & scan", icon: IconReceipt },
  { href: "/depenses-fixes", label: "Dépenses fixes", icon: IconCalendar },
  { href: "/categories", label: "Catégories", icon: IconTag },
  { href: "/sous-categories", label: "Sous-catégories", icon: IconBars },
  { href: "/comptes", label: "Comptes", icon: IconWallet },
  { href: "/budgets", label: "Budgets", icon: IconBudget },
  { href: "/objectifs", label: "Objectifs", icon: IconFlag },
  { href: "/analyses", label: "Analyses", icon: IconChart },
  { href: "/rapports", label: "Rapports", icon: IconReport },
  { href: "/parametres", label: "Paramètres", icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [pendingReceipts, setPendingReceipts] = useState(0);
  const [inbox, setInbox] = useState<{ exists: boolean; recent?: Array<{ at?: string | null }> }>({ exists: false });
  const [lastMinutes, setLastMinutes] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const [summary, status] = await Promise.all([fetch("/api/summary"), fetch("/api/inbox/status")]);
      if (summary.ok) setPendingReceipts((await summary.json()).pendingReceipts ?? 0);
      if (status.ok) {
        const next = await status.json();
        setInbox(next);
        const at = next.recent?.[0]?.at;
        setLastMinutes(at ? Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 60_000)) : null);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 20_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Image src="/logo.svg" alt="" width={16} height={16} priority />
        </div>
        <div>
          <strong>MaVie</strong>
          <span>Suivi de dépenses</span>
        </div>
      </div>

      <nav className="side-nav">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? "active" : ""}`}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              {item.href === "/recus" && pendingReceipts > 0 && <small className="nav-badge">{pendingReceipts}</small>}
            </Link>
          );
        })}
      </nav>

      <div className="side-footer">
        <span className="side-footer-icon">
          <IconCloud size={18} />
        </span>
        <div>
          <strong>{inbox.exists ? "iPhone connecté" : "iCloud indisponible"}</strong>
          <span>{inbox.exists ? lastMinutes == null ? "Aucun reçu récent" : `Dernier reçu il y a ${lastMinutes} min` : "Vérifie le dossier iCloud"}</span>
        </div>
      </div>
    </aside>
  );
}
