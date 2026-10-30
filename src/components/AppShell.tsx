import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";

export function AppShell({
  title,
  eyebrow,
  actions,
  children,
}: {
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <Sidebar />
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <main className="main" id="contenu" tabIndex={-1}>
        {title && (
          <header className="page-head">
            <div>
              
              <h1>{title}</h1>
              {eyebrow && <p className="muted">{eyebrow}</p>}
            </div>
            {actions && <div className="page-actions">{actions}</div>}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
