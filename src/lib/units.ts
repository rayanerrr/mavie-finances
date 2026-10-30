export type Unit = "kg" | "L" | "unité";

const FACTORS: Record<string, { unit: Unit; factor: number }> = {
  kg: { unit: "kg", factor: 1 },
  kilo: { unit: "kg", factor: 1 },
  g: { unit: "kg", factor: 0.001 },
  lb: { unit: "kg", factor: 0.453592 },
  l: { unit: "L", factor: 1 },
  litre: { unit: "L", factor: 1 },
  ml: { unit: "L", factor: 0.001 },
  u: { unit: "unité", factor: 1 },
  un: { unit: "unité", factor: 1 },
  unite: { unit: "unité", factor: 1 },
  unité: { unit: "unité", factor: 1 },
  pc: { unit: "unité", factor: 1 },
};

/** Converts g/lb/ml… to the three units used for price comparisons: kg, L and unité. */
export function normalizeQuantity(
  quantity: number | null | undefined,
  unit: string | null | undefined,
): { quantity: number | null; unit: Unit | null } {
  if (quantity == null || !Number.isFinite(quantity) || quantity <= 0) {
    return { quantity: null, unit: null };
  }
  const key = (unit ?? "unité").trim().toLowerCase().replace(/s$/, "");
  const match = FACTORS[key] ?? FACTORS.unité;
  return { quantity: Math.round(quantity * match.factor * 1000) / 1000, unit: match.unit };
}

export function formatQuantity(quantity: number, unit: string) {
  const digits = unit === "unité" ? 0 : 1;
  const value = quantity.toLocaleString("fr-CA", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  if (unit === "unité") return `${value} unité${quantity >= 2 ? "s" : ""}`;
  return `${value} ${unit}`;
}

export function formatUnitPrice(price: number, unit: string) {
  const value = price.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value} $/${unit}`;
}
