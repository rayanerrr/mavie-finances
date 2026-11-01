import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ConfirmProvider } from "@/components/confirm";

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
    <ConfirmProvider>
    <div className="shell">
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <Sidebar />
      <main className="main" id="contenu" tabIndex={-1}>
        {title && (
          <header className="page-head">
            <div>
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <h1>{title}</h1>
            </div>
            {actions && <div className="page-actions">{actions}</div>}
          </header>
        )}
        {children}
      </main>
    </div>
    </ConfirmProvider>
  );
}
