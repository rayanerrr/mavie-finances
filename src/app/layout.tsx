import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/components/ThemeToggle";

// Polices de l'exemple de tableau de bord de ui-ux-pro-max (paire « Dashboard Data ») :
// Fira Sans pour le texte, Fira Code pour les chiffres. next/font les intègre à la
// construction : elles marchent hors ligne.
const sans = Fira_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const mono = Fira_Code({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
    <html lang="fr" className={`${sans.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Applique le mode clair/sombre avant l'affichage (pas de flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
