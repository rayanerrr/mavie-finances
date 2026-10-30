export type MerchantMeta = {
  key: string;
  label: string;
  bg: string;
  fg: string;
  glyph: string;
};

const MERCHANTS: MerchantMeta[] = [
  { key: "maxi", label: "Maxi", bg: "#ffffff", fg: "#e11d2e", glyph: "maxi" },
  { key: "esso", label: "Esso", bg: "#ffffff", fg: "#d11f2f", glyph: "esso" },
  { key: "shell", label: "Shell", bg: "#fbce07", fg: "#dd1d21", glyph: "S" },
  { key: "uber", label: "Uber", bg: "#000000", fg: "#ffffff", glyph: "Uber" },
  { key: "amazon", label: "Amazon", bg: "#ffffff", fg: "#111111", glyph: "a" },
  { key: "mcdonalds", label: "McDonald's", bg: "#da291c", fg: "#ffc72c", glyph: "M" },
  { key: "spotify", label: "Spotify", bg: "#1ed760", fg: "#000000", glyph: "≋" },
  { key: "iga", label: "IGA", bg: "#e30613", fg: "#ffffff", glyph: "IGA" },
  { key: "hydroquebec", label: "Hydro-Québec", bg: "#ffffff", fg: "#1d4ed8", glyph: "HQ" },
  { key: "jeancoutu", label: "Jean Coutu", bg: "#ffffff", fg: "#0b4ea2", glyph: "JC" },
  { key: "adonis", label: "Adonis", bg: "#1f7a3a", fg: "#ffffff", glyph: "A" },
  { key: "costco", label: "Costco", bg: "#005daa", fg: "#ffffff", glyph: "C" },
  { key: "netflix", label: "Netflix", bg: "#000000", fg: "#e50914", glyph: "N" },
  { key: "bell", label: "Bell", bg: "#00549a", fg: "#ffffff", glyph: "B" },
  { key: "virement", label: "Virement", bg: "#10b981", fg: "#ffffff", glyph: "$" },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function merchantKeyFromStore(store?: string | null): string | null {
  if (!store) return null;
  const normalized = normalize(store);
  const found = MERCHANTS.find(
    (m) => normalized.includes(m.key) || normalize(m.label) === normalized,
  );
  return found?.key ?? null;
}

export function merchantMeta(key?: string | null, store?: string | null): MerchantMeta {
  const byKey = MERCHANTS.find((m) => m.key === key);
  if (byKey) return byKey;
  const inferred = merchantKeyFromStore(store);
  const byInferred = MERCHANTS.find((m) => m.key === inferred);
  if (byInferred) return byInferred;
  const label = store?.trim() || "—";
  return {
    key: "unknown",
    label,
    bg: "#334155",
    fg: "#e2e8f0",
    glyph: label.charAt(0).toUpperCase(),
  };
}
