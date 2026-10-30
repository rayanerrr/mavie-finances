import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Police identique à finances 3. next/font l'intègre à la construction : elle marche hors ligne.
const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

// Données locales qui changent sans arrêt : jamais de page pré-rendue ni de cache
// (le cache serait écrit dans l'app et casserait sa signature).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MaVie · Suivi de dépenses",
  description: "Suivi des dépenses du foyer partagé",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
