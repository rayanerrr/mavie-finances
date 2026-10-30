import type { Metadata } from "next";
import "./globals.css";

// Données locales qui changent sans arrêt : jamais de page pré-rendue ni de cache
// (le cache serait écrit dans l'app et casserait sa signature).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MaVie — Finances du foyer",
  icons: { icon: "/favicon.svg" },
  description: "Suivi des dépenses du foyer partagé",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-CA" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
