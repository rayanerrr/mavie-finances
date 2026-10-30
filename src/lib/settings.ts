import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

const DEFAULTS: Record<string, string> = {
  inboxEnabled: "true",
  inboxDir: "",
  geminiModel: "",
  // Lecture des reçus : "auto" = gpt-reserve (codex) puis Gemini en secours.
  receiptReader: "auto",
  codexModel: "gpt-reserve",
  currency: "CAD",
  people: JSON.stringify(["moi", "femme", "fils"]),
  householdName: "Foyer",
};

export function getSetting(key: string): string {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? DEFAULTS[key] ?? "";
}

export function getAllSettings() {
  const rows = db.select().from(settings).all();
  const map = { ...DEFAULTS };
  for (const row of rows) map[row.key] = row.value;
  const key = getGeminiKey();
  const safe: Record<string, string | boolean> = {};
  for (const name of ALLOWED_SETTINGS) if (name !== "geminiApiKey") safe[name] = map[name] ?? "";
  return {...safe, geminiConfigured:!!key, geminiKeyHint:key ? `…${key.slice(-4)}` : ""};
}

export const ALLOWED_SETTINGS = ["geminiApiKey","geminiModel","receiptReader","codexModel","people","householdName","currency","inboxDir","inboxEnabled"];
export function getGeminiKey() { return getSetting("geminiApiKey").trim() || process.env.GEMINI_API_KEY?.trim() || ""; }
export function setSetting(key: string, value: string) {
  if (!ALLOWED_SETTINGS.includes(key)) throw new Error("Réglage non autorisé");
  if (key === "people") {
    let people: unknown;
    try { people = JSON.parse(value); } catch { throw new Error("Liste de personnes invalide"); }
    if (!Array.isArray(people) || !people.every(p=>typeof p === "string")) throw new Error("Liste de personnes invalide");
  }
  if (key === "inboxEnabled" && !["true","false"].includes(value)) throw new Error("Valeur booléenne requise");
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) {
    return db
      .update(settings)
      .set({ value })
      .where(eq(settings.key, key))
      .returning()
      .get();
  }
  return db.insert(settings).values({ key, value }).returning().get();
}
