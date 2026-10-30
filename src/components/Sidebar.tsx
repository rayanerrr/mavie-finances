"use client";

import Image from "next/image";
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

type NavItem = { href: string; label: string; icon: typeof IconHome; badge?: "receipts" };

const SECTIONS: Array<{ title?: string; items: NavItem[] }> = [
  {
    items: [
      { href: "/", label: "Tableau de bord", icon: IconHome },
      { href: "/transactions", label: "Transactions", icon: IconList },
      { href: "/ajouter", label: "Ajouter un achat", icon: IconPlusCircle },
      { href: "/recus", label: "Reçus & scan", icon: IconReceipt, badge: "receipts" },
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

type InboxState = {
  enabled: boolean;
  exists: boolean;
  waitingFiles: number;
  lastError: string | null;
  recent: Array<{ at: string }>;
};

function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

/** Pastille iPhone + nombre de reçus à vérifier, rafraîchis toutes les 20 s. */
function useLiveStatus() {
  const [inbox, setInbox] = useState<InboxState | null>(null);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [a, b] = await Promise.all([fetch("/api/inbox/status"), fetch("/api/summary")]);
        if (!alive) return;
        if (a.ok) setInbox(await a.json());
        if (b.ok) setPending(Number((await b.json()).pendingReceipts ?? 0));
      } catch {
        /* Le serveur redémarre : on réessaie au prochain tour. */
      }
    };
    void load();
    const timer = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return { inbox, pending };
}

export function Sidebar() {
  const pathname = usePathname();
  const { inbox, pending } = useLiveStatus();

  let syncTitle = "iPhone et iCloud";
  let syncText = "Vérification…";
  let syncTone = "";
  if (inbox) {
    if (!inbox.enabled) {
      syncText = "Réception iPhone en pause";
    } else if (!inbox.exists || inbox.lastError) {
      syncTitle = "iCloud indisponible";
      syncText = inbox.lastError ?? "Dossier iCloud Drive/MaVie introuvable";
      syncTone = "warn";
    } else {
      syncTitle = "iPhone connecté";
      syncText = inbox.waitingFiles
        ? `${inbox.waitingFiles} envoi(s) en cours de lecture`
        : inbox.recent[0]
          ? `Dernier reçu ${ago(inbox.recent[0].at)}`
          : "Prêt à recevoir tes photos";
      syncTone = "ok";
    }
  }

  return (
    <aside className="sidebar">
      <div className="mac-drag" aria-hidden />
      <div className="brand">
        <Image src="/logo.svg" width={40} height={30} alt="TWR" className="brand-logo" priority />
        <div>
          <strong>MaVie</strong>
          <span>Finances du foyer</span>
        </div>
      </div>

      <nav className="side-nav" aria-label="Navigation principale">
        {SECTIONS.map((section, index) => (
          <div className="nav-section" key={section.title ?? index}>
            {section.title && <p className="nav-section-title">{section.title}</p>}
            {section.items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              const count = item.badge === "receipts" ? pending : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {count > 0 && (
                    <span className="nav-badge" aria-label={`${count} à vérifier`}>
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <Link href="/parametres#iphone" className={`side-footer ${syncTone}`}>
        <span className="side-footer-icon">
          <IconCloud size={18} />
        </span>
        <div>
          <strong>{syncTitle}</strong>
          <span>{syncText}</span>
        </div>
      </Link>
    </aside>
  );
}
