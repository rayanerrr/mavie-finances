"use client";

import Link from "next/link";
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

// Menu regroupé par usage (ui-ux-pro-max « nav-hierarchy ») : on trouve vite où aller.
const SECTIONS = [
  {
    title: "Au quotidien",
    items: [
      { href: "/", label: "Tableau de bord", icon: IconHome },
      { href: "/transactions", label: "Transactions", icon: IconList },
      { href: "/ajouter", label: "Ajouter un achat", icon: IconPlusCircle },
      { href: "/recus", label: "Reçus & scan", icon: IconReceipt },
      { href: "/depenses-fixes", label: "Dépenses fixes", icon: IconCalendar },
    ],
  },
  {
    title: "Planifier",
    items: [
      { href: "/budgets", label: "Budgets", icon: IconBudget },
      { href: "/objectifs", label: "Objectifs", icon: IconFlag },
      { href: "/analyses", label: "Analyses", icon: IconChart },
      { href: "/rapports", label: "Rapports", icon: IconReport },
    ],
  },
  {
    title: "Organiser",
    items: [
      { href: "/categories", label: "Catégories", icon: IconTag },
      { href: "/sous-categories", label: "Sous-catégories", icon: IconBars },
      { href: "/comptes", label: "Comptes", icon: IconWallet },
      { href: "/parametres", label: "Paramètres", icon: IconSettings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [pendingReceipts, setPendingReceipts] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/summary");
        if (response.ok) setPendingReceipts((await response.json()).pendingReceipts ?? 0);
      } catch {
        /* serveur en redémarrage : on réessaie au prochain tour */
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
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
            <path d="M6 3h9l4 4v14H6z" opacity="0.9" />
            <path d="M9 12h6M9 16h4" stroke="#1d4ed8" strokeWidth="1.6" />
          </svg>
        </div>
        <div>
          <strong>MaVie</strong>
          <span>Suivi de dépenses</span>
        </div>
      </div>

      <nav className="side-nav" aria-label="Navigation principale">
        {SECTIONS.map((section) => (
          <div className="nav-section" key={section.title}>
            <p className="nav-section-title">{section.title}</p>
            {section.items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={17} aria-hidden />
                  <span>{item.label}</span>
                  {item.href === "/recus" && pendingReceipts > 0 && (
                    <small className="nav-badge" aria-label={`${pendingReceipts} reçu(s) à vérifier`}>
                      {pendingReceipts}
                    </small>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="side-footer">
        <span className="side-footer-icon">
          <IconCloud size={18} />
        </span>
        <div>
          <strong>Mode hors ligne</strong>
          <span>Toutes vos données sur votre Mac</span>
        </div>
      </div>
    </aside>
  );
}
