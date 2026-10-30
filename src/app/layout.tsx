import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MaVie — Finances du foyer",
  icons: { icon: "/favicon.svg" },
  description: "Suivi des dépenses du foyer partagé",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-CA">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
