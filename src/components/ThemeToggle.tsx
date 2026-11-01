"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/** Mode d'affichage : clair, sombre ou automatique (suit macOS). Mémorisé sur ce Mac. */
export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "mavie-theme";

declare global {
  interface Window {
    mavieDesktop?: { setTheme?: (mode: ThemeMode) => Promise<void> };
  }
}

function resolve(mode: ThemeMode) {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(mode: ThemeMode) {
  document.documentElement.dataset.theme = resolve(mode);
}

const OPTIONS: Array<{ mode: ThemeMode; label: string; Icon: typeof Sun }> = [
  { mode: "light", label: "Clair", Icon: Sun },
  { mode: "dark", label: "Sombre", Icon: Moon },
  { mode: "system", label: "Auto", Icon: Monitor },
];

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  // Lecture du choix mémorisé une fois monté (le script de <head> l'a déjà appliqué).
  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "system";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronisation avec le stockage local
    setMode(saved);
  }, []);

  // Application, synchronisation de la barre de titre (app Mac) et suivi de macOS en mode Auto.
  useEffect(() => {
    apply(mode);
    void window.mavieDesktop?.setTheme?.(mode);
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  function choose(next: ThemeMode) {
    localStorage.setItem(STORAGE_KEY, next);
    setMode(next);
  }

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Mode d’affichage">
      {OPTIONS.map(({ mode: option, label, Icon }) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={mode === option}
          className={mode === option ? "active" : ""}
          onClick={() => choose(option)}
          title={option === "system" ? "Suit le réglage de macOS" : `Mode ${label.toLowerCase()}`}
        >
          <Icon size={14} aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

/** Script exécuté avant l'affichage : évite un flash clair quand le mode sombre est choisi. */
export const THEME_BOOT_SCRIPT = `(function(){try{var m=localStorage.getItem('${STORAGE_KEY}')||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;
