/**
 * Données de démonstration (mai → octobre 2026) pour visualiser le tableau de bord.
 * Usage : npm run db:demo   (après npm run db:seed sur une base vide)
 */
import { createExpenses, type ExpenseInput } from "../src/lib/expenses";
import { analyzeReceipt, createReceiptFromFile } from "../src/lib/receipts";

let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
function between(min: number, max: number) {
  return Math.round((min + rand() * (max - min)) * 100) / 100;
}
function pick<T>(list: T[]): T {
  return list[Math.floor(rand() * list.length)];
}

const CARD = 1;
const CHEQUE = 2;

const GROCERY: Array<[string, string, number, number]> = [
  ["Boeuf haché 500g", "Viande", 8.5, 11],
  ["Kefta", "Viande", 9, 14],
  ["Steak de surlonge", "Viande", 14, 22],
  ["Poitrine de poulet", "Poulet", 11, 16],
  ["Cuisses de poulet", "Poulet", 8, 12],
  ["Filet de saumon", "Poisson", 12, 18],
  ["Jambon tranché", "Charcuterie", 4.5, 7],
  ["Saucisses", "Charcuterie", 5, 8],
  ["Lait 2L", "Produits laitiers", 3.99, 4.79],
  ["Yogourt", "Produits laitiers", 4, 6.5],
  ["Fromage", "Produits laitiers", 6, 9],
  ["Oeufs 12", "Produits laitiers", 3.79, 4.99],
  ["Tomates", "Légumes", 3, 5],
  ["Concombres", "Légumes", 2, 3.5],
  ["Pommes de terre", "Légumes", 4, 6],
  ["Bananes", "Fruits", 1.5, 2.5],
  ["Pommes", "Fruits", 4, 6],
  ["Pain blanc", "Pains & céréales", 2.5, 3.5],
  ["Céréales", "Pains & céréales", 4.5, 6.5],
  ["Riz basmati", "Autres", 6, 12],
];

const MONTHS = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

function day(month: string, d: number) {
  return `${month}-${String(d).padStart(2, "0")}`;
}

const items: ExpenseInput[] = [];

for (const month of MONTHS) {
  const isOct = month === "2026-10";

  items.push(
    {
      date: day(month, 20),
      amount: 3200,
      description: "Salaire",
      store: "Virement",
      category: "Revenu",
      subcategory: "Salaire",
      type: "income",
      accountId: CHEQUE,
      person: "moi",
    },
    {
      date: day(month, 1),
      amount: 1024,
      description: "Loyer",
      store: "Propriétaire",
      category: "Logement",
      subcategory: "Loyer",
      accountId: CHEQUE,
    },
    {
      date: day(month, 24),
      amount: between(62, 110),
      description: "Facture mensuelle",
      store: "Hydro-Québec",
      category: "Factures & Services",
      subcategory: "Électricité",
      accountId: CHEQUE,
    },
    {
      date: day(month, 5),
      amount: 45,
      description: "Internet maison",
      store: "Bell",
      category: "Factures & Services",
      subcategory: "Internet",
      accountId: CHEQUE,
    },
    {
      date: day(month, 21),
      amount: 12.99,
      description: "Abonnement",
      store: "Spotify",
      category: "Divertissement",
      subcategory: "Musique",
      accountId: CARD,
    },
    {
      date: day(month, 12),
      amount: 18.99,
      description: "Abonnement",
      store: "Netflix",
      category: "Divertissement",
      subcategory: "Streaming",
      accountId: CARD,
    },
  );

  const trips = isOct ? 7 : 6;
  for (let t = 0; t < trips; t += 1) {
    const d = 3 + t * 6 + Math.floor(rand() * 3);
    const store = pick(["Maxi", "Maxi", "IGA", "Adonis"]);
    const count = 4 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i += 1) {
      const [desc, sub, min, max] = pick(GROCERY);
      const meatBoost = isOct && (sub === "Viande" || sub === "Poulet") ? 1.4 : 1;
      items.push({
        date: day(month, Math.min(d, 28)),
        amount: Math.round(between(min, max) * meatBoost * 100) / 100,
        description: desc,
        store,
        category: "Alimentation",
        subcategory: sub,
        accountId: CARD,
        source: "receipt",
        person: pick(["moi", "femme"]),
      });
    }
  }

  for (let i = 0; i < 4; i += 1) {
    items.push({
      date: day(month, 4 + i * 7),
      amount: between(58, 76),
      description: "Plein d'essence",
      store: pick(["Esso", "Shell"]),
      category: "Transport",
      subcategory: "Essence",
      accountId: CARD,
      person: i % 2 ? "femme" : "moi",
    });
  }
  const ubers = isOct ? 4 : 2;
  for (let i = 0; i < ubers; i += 1) {
    items.push({
      date: day(month, 6 + i * 6),
      amount: between(14, 26),
      description: "Course soir",
      store: "Uber",
      category: "Transport",
      subcategory: "Covoiturage",
      accountId: CARD,
    });
  }

  const restos = isOct ? 8 : 5;
  for (let i = 0; i < restos; i += 1) {
    const fast = rand() < 0.5;
    items.push({
      date: day(month, 2 + i * 3),
      amount: fast ? between(10, 18) : between(28, 55),
      description: fast ? "Big Mac menu" : "Souper au restaurant",
      store: fast ? "McDonald's" : pick(["Restaurant Liban", "Sushi Shop", "St-Hubert"]),
      category: "Restaurants",
      subcategory: fast ? "Fast food" : "Restaurant",
      accountId: CARD,
      person: pick(["moi", "femme", "fils"]),
    });
  }

  const shops = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < shops; i += 1) {
    items.push({
      date: day(month, 9 + i * 8),
      amount: between(25, 95),
      description: pick(["Souris Logitech", "Câble USB-C", "Organisateur", "T-shirt"]),
      store: "Amazon",
      category: "Magasinage",
      subcategory: pick(["Électronique", "Maison", "Vêtements"]),
      accountId: CARD,
    });
  }

  items.push(
    {
      date: day(month, 22),
      amount: between(18, 40),
      description: "Vitamines",
      store: "Jean Coutu",
      category: "Santé & Fitness",
      subcategory: "Pharmacie",
      accountId: CARD,
    },
    {
      date: day(month, 2),
      amount: 44.99,
      description: "Abonnement gym",
      store: "Énergie Cardio",
      category: "Santé & Fitness",
      subcategory: "Gym",
      accountId: CARD,
    },
    {
      date: day(month, 15),
      amount: between(28, 60),
      description: "Activité soccer",
      store: "Ville",
      category: "Enfants",
      subcategory: "Activités",
      accountId: CARD,
      person: "fils",
    },
    {
      date: day(month, 26),
      amount: between(20, 60),
      description: "Divers maison",
      store: "Dollarama",
      category: "Autres",
      subcategory: "Divers",
      accountId: CARD,
    },
  );
}

items.push({
  date: "2026-10-28",
  amount: 72.41,
  description: "Plein d'essence",
  store: "Esso",
  category: "Transport",
  subcategory: "Essence",
  accountId: CARD,
  person: "femme",
});

const RECEIPT_ITEMS: Array<[string, number, string]> = [
  ["Boeuf haché 500g", 9.99, "Viande"],
  ["Poitrine de poulet", 12.45, "Poulet"],
  ["Tomates", 4.5, "Légumes"],
  ["Lait 2L", 3.99, "Produits laitiers"],
  ["Pain blanc", 2.99, "Pains & céréales"],
  ["Oeufs 12", 3.79, "Produits laitiers"],
  ["Banane", 1.23, "Fruits"],
  ["Concombres", 2.99, "Légumes"],
];

function receiptSvg() {
  const rows = RECEIPT_ITEMS.map(
    ([name, price], i) =>
      `<text x="14" y="${118 + i * 15}">${name}</text><text x="186" y="${118 + i * 15}" text-anchor="end">${price.toFixed(2)}</text>`,
  ).join("");
  const total = RECEIPT_ITEMS.reduce((s, [, p]) => s + p, 0).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="270" viewBox="0 0 200 270">
<rect width="200" height="270" fill="#f7f6f1"/>
<rect x="55" y="10" width="90" height="34" fill="#111"/>
<text x="100" y="35" font-family="Arial Black,Arial" font-weight="900" font-size="24" fill="#fff" text-anchor="middle">maxi</text>
<g font-family="Courier New,monospace" font-size="10" fill="#222">
<text x="100" y="60" text-anchor="middle">Brossard</text>
<text x="100" y="73" text-anchor="middle">6950 Blvd. Taschereau</text>
<text x="100" y="86" text-anchor="middle">Brossard, QC J4Z 1A7</text>
<line x1="10" y1="98" x2="190" y2="98" stroke="#999" stroke-dasharray="3 2"/>
${rows}
<line x1="10" y1="${118 + RECEIPT_ITEMS.length * 15}" x2="190" y2="${118 + RECEIPT_ITEMS.length * 15}" stroke="#999" stroke-dasharray="3 2"/>
<text x="14" y="${136 + RECEIPT_ITEMS.length * 15}" font-weight="bold">Total</text>
<text x="186" y="${136 + RECEIPT_ITEMS.length * 15}" text-anchor="end" font-weight="bold">${total}</text>
</g></svg>`;
}

async function main() {
  const created = await createExpenses(
    items.map((i) => ({ type: "expense" as const, source: "text" as const, ...i })),
  );

  const receipt = createReceiptFromFile({
    filename: "recu-maxi-demo.svg",
    mime: "image/svg+xml",
    buffer: Buffer.from(receiptSvg()),
    accountId: CARD,
    store: "Maxi",
  });
  analyzeReceipt(receipt.id, {
    store: "Maxi",
    items: RECEIPT_ITEMS.map(([description, amount, subcategory]) => ({
      description,
      amount,
      category: "Alimentation",
      subcategory,
    })),
  });

  console.log(
    `Démo OK — ${created.length} transactions (mai → octobre 2026) + reçu Maxi #${receipt.id} à confirmer.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
