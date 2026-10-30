import type Database from "better-sqlite3";
import { colorForCategory } from "../lib/classify";
import { slugify } from "../lib/slug";
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


export function seedCore(sqlite: Database.Database) {
  sqlite.transaction(() => {
    const empty = !(sqlite.prepare("SELECT id FROM categories LIMIT 1").get());
    if (empty) {
      for (const cat of SEED_CATS) {
        const result = sqlite.prepare("INSERT INTO categories(name,slug,color,kind) VALUES(?,?,?,?)").run(cat.name, slugify(cat.name), colorForCategory(cat.name), cat.kind);
        for (const sub of cat.subs) sqlite.prepare("INSERT INTO subcategories(category_id,name,slug) VALUES(?,?,?)").run(result.lastInsertRowid, sub, slugify(sub));
      }
      for (const acc of ACCOUNTS) sqlite.prepare("INSERT OR IGNORE INTO accounts(name,type,color) VALUES(?,?,?)").run(acc.name,acc.type,acc.color);
    }
    for (const [key,value] of Object.entries({currency:"CAD", people:JSON.stringify(["moi","femme","fils"]), householdName:"Foyer", inboxEnabled:"true"})) {
      sqlite.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)").run(key,value);
    }
    for (const cat of SEED_CATS) sqlite.prepare("UPDATE categories SET color=? WHERE name=?").run(colorForCategory(cat.name),cat.name);
  })();
}
