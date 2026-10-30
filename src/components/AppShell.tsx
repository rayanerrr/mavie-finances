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
      <main className="main">
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
  );
}
