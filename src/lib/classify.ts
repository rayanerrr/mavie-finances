export const CATEGORY_COLORS: Record<string, string> = {
  Alimentation: "#3987e5", Logement: "#d95926", Transport: "#199e70",
  Magasinage: "#c98500", Restaurants: "#d55181", "Santé & Fitness": "#008300",
  "Factures & Services": "#9085e9", Divertissement: "#e66767", Enfants: "#a3a29a",
  Autres: "#6b6a65", Revenu: "#22c55e",
};

export type CategoryIconKey =
  | "cart"
  | "home"
  | "car"
  | "bag"
  | "fork"
  | "heart"
  | "bolt"
  | "music"
  | "baby"
  | "dots"
  | "dollar";

export const CATEGORY_ICONS: Record<string, CategoryIconKey> = {
  Alimentation: "cart",
  Logement: "home",
  Transport: "car",
  Magasinage: "bag",
  Restaurants: "fork",
  "Santé & Fitness": "heart",
  "Factures & Services": "bolt",
  Divertissement: "music",
  Enfants: "baby",
  Autres: "dots",
  Revenu: "dollar",
};

export function colorForCategory(name: string, index = 0): string {
  void index;
  return CATEGORY_COLORS[name] ?? "#6b6a65";
}

export function iconForCategory(name: string | null | undefined): CategoryIconKey {
  return (name && CATEGORY_ICONS[name]) || "dots";
}

export const BREAKDOWN_COLORS = Object.values(CATEGORY_COLORS).slice(0, 10);
