import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

const DEFAULTS: Record<string, string> = {
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
  return map;
}

export function setSetting(key: string, value: string) {
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
