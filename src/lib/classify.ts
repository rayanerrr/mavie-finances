export const CATEGORY_COLORS: Record<string, string> = {
  Alimentation: "#22c55e",
  Logement: "#3b82f6",
  Transport: "#f59e0b",
  Magasinage: "#ec4899",
  Restaurants: "#f43f5e",
  "Santé & Fitness": "#22d3ee",
  "Factures & Services": "#a78bfa",
  Divertissement: "#facc15",
  Enfants: "#fb923c",
  Autres: "#94a3b8",
  Revenu: "#10b981",
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
  | "dollar"
  | "cutlery"
  | "pulse"
  | "doc"
  | "gamepad"
  | "users"
  | "coins"
  | "plane"
  | "gift"
  | "paw"
  | "book";

export const ICON_CHOICES: CategoryIconKey[] = [
  "cutlery",
  "cart",
  "home",
  "car",
  "bag",
  "fork",
  "pulse",
  "heart",
  "doc",
  "bolt",
  "gamepad",
  "music",
  "users",
  "baby",
  "coins",
  "dollar",
  "plane",
  "gift",
  "paw",
  "book",
  "dots",
];

export const CATEGORY_ICONS: Record<string, CategoryIconKey> = {
  Alimentation: "cutlery",
  Logement: "home",
  Transport: "car",
  Magasinage: "bag",
  Restaurants: "fork",
  "Santé & Fitness": "pulse",
  "Factures & Services": "doc",
  Divertissement: "gamepad",
  Enfants: "users",
  Autres: "dots",
  Revenu: "coins",
};

export const COLOR_CHOICES = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#22d3ee",
  "#f43f5e",
];

export function isIconKey(value: unknown): value is CategoryIconKey {
  return typeof value === "string" && (ICON_CHOICES as string[]).includes(value);
}

const PALETTE = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#f43f5e",
  "#22d3ee",
  "#a78bfa",
  "#facc15",
  "#fb923c",
  "#94a3b8",
];

export function colorForCategory(name: string, index = 0): string {
  return CATEGORY_COLORS[name] ?? PALETTE[index % PALETTE.length];
}

export function iconForCategory(name: string | null | undefined): CategoryIconKey {
  return (name && CATEGORY_ICONS[name]) || "dots";
}

export const BREAKDOWN_COLORS = [
  "#f43f5e",
  "#fb7185",
  "#3b82f6",
  "#ec4899",
  "#60a5fa",
  "#22c55e",
  "#facc15",
  "#a16207",
  "#94a3b8",
];
