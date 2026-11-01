import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Police « Financial Trust » recommandée par ui-ux-pro-max pour la finance.
// next/font l'intègre à la construction : elle marche hors ligne.
const plex = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="fr" className={`${plex.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
