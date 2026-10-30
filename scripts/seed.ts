import { eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  accounts,
  budgets,
  categories,
  goals,
  settings,
  subcategories,
} from "../src/db/schema";
import { colorForCategory } from "../src/lib/classify";
import { slugify } from "../src/lib/slug";
import { currentMonthKey } from "../src/lib/money";

const SEED_CATS: Array<{
  name: string;
  kind: "essential" | "discretionary" | "income";
  subs: string[];
}> = [
  {
    name: "Alimentation",
    kind: "essential",
    subs: [
      "Viande",
      "Poulet",
      "Poisson",
      "Charcuterie",
      "Produits laitiers",
      "Légumes",
      "Fruits",
      "Pains & céréales",
      "Autres",
    ],
  },
  { name: "Logement", kind: "essential", subs: ["Loyer", "Entretien", "Meubles"] },
  {
    name: "Transport",
    kind: "essential",
    subs: ["Essence", "Covoiturage", "Stationnement", "Entretien auto"],
  },
  {
    name: "Magasinage",
    kind: "discretionary",
    subs: ["Électronique", "Vêtements", "Maison"],
  },
  { name: "Restaurants", kind: "discretionary", subs: ["Fast food", "Café", "Restaurant"] },
  {
    name: "Santé & Fitness",
    kind: "essential",
    subs: ["Pharmacie", "Gym", "Médecin"],
  },
  {
    name: "Factures & Services",
    kind: "essential",
    subs: ["Électricité", "Internet", "Téléphone", "Assurances"],
  },
  { name: "Divertissement", kind: "discretionary", subs: ["Musique", "Streaming", "Sorties"] },
  { name: "Enfants", kind: "essential", subs: ["École", "Activités", "Vêtements", "Jouets"] },
  { name: "Autres", kind: "discretionary", subs: ["Divers"] },
  { name: "Revenu", kind: "income", subs: ["Salaire", "Autre"] },
];

const ACCOUNTS = [
  { name: "Carte principale", type: "carte", color: "#7c5cff" },
  { name: "Compte chèque", type: "cheque", color: "#22c55e" },
  { name: "Espèces", type: "especes", color: "#f59e0b" },
];

function ensureCategory(
  name: string,
  kind: "essential" | "discretionary" | "income",
) {
  const slug = slugify(name);
  const existing = db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .get();
  if (existing) {
    db.update(categories)
      .set({ color: colorForCategory(name), kind })
      .where(eq(categories.id, existing.id))
      .run();
    return existing;
  }
  return db
    .insert(categories)
    .values({
      name,
      slug,
      color: colorForCategory(name),
      kind,
    })
    .returning()
    .get();
}

function ensureSub(categoryId: number, name: string) {
  const slug = slugify(name);
  const existing = db
    .select()
    .from(subcategories)
    .all()
    .find((s) => s.categoryId === categoryId && s.slug === slug);
  if (existing) return existing;
  return db
    .insert(subcategories)
    .values({ categoryId, name, slug })
    .returning()
    .get();
}

for (const acc of ACCOUNTS) {
  const existing = db
    .select()
    .from(accounts)
    .where(eq(accounts.name, acc.name))
    .get();
  if (!existing) {
    db.insert(accounts).values(acc).run();
  }
}

const month = currentMonthKey();
const catIds: Record<string, number> = {};

for (const cat of SEED_CATS) {
  const row = ensureCategory(cat.name, cat.kind);
  catIds[cat.name] = row.id;
  for (const sub of cat.subs) ensureSub(row.id, sub);
}

const budgetSeeds: Array<[string, number]> = [
  ["Alimentation", 600],
  ["Logement", 1400],
  ["Transport", 350],
  ["Restaurants", 150],
  ["Magasinage", 250],
];

for (const [name, amount] of budgetSeeds) {
  const categoryId = catIds[name];
  if (!categoryId) continue;
  const existing = db
    .select()
    .from(budgets)
    .all()
    .find((b) => b.categoryId === categoryId && b.monthKey === month);
  if (!existing) {
    db.insert(budgets).values({ categoryId, monthKey: month, amount }).run();
  }
}

if (db.select().from(goals).all().length === 0) {
  db.insert(goals)
    .values([
      {
        title: "Fonds d’urgence",
        targetAmount: 5000,
        currentAmount: 1200,
        deadline: "2026-12-31",
      },
      {
        title: "Vacances famille",
        targetAmount: 3000,
        currentAmount: 450,
        deadline: "2027-07-01",
      },
    ])
    .run();
}

for (const row of [
  { key: "currency", value: "CAD" },
  { key: "people", value: JSON.stringify(["moi", "femme", "fils"]) },
  { key: "householdName", value: "Foyer" },
]) {
  const existing = db
    .select()
    .from(settings)
    .where(eq(settings.key, row.key))
    .get();
  if (!existing) db.insert(settings).values(row).run();
}

console.log("Seed OK — comptes, catégories MaVie, budgets, objectifs.");
