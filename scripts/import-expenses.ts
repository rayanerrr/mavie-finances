/**
 * Import batch d'expenses depuis un JSON.
 *
 * Usage:
 *   npx tsx scripts/import-expenses.ts path/to/items.json
 *   npx tsx scripts/import-expenses.ts --stdin < items.json
 *
 * Format JSON: tableau d'objets
 * {
 *   "date": "2026-10-28",
 *   "amount": 12.45,
 *   "description": "Kefta",
 *   "category": "Viande",
 *   "subcategory": "Kefta",
 *   "store": "Adonis",
 *   "person": "moi",
 *   "source": "receipt",
 *   "notes": "optionnel"
 * }
 */

import fs from "fs";
import { createExpenses, type ExpenseInput } from "../src/lib/expenses";

async function readInput(): Promise<ExpenseInput[]> {
  const arg = process.argv[2];

  let raw: string;
  if (!arg || arg === "--stdin") {
    raw = fs.readFileSync(0, "utf8");
  } else {
    raw = fs.readFileSync(arg, "utf8");
  }

  const parsed = JSON.parse(raw);
  const items: ExpenseInput[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.items)
      ? parsed.items
      : [parsed];

  return items;
}

async function main() {
  const items = await readInput();
  if (!items.length) {
    console.error("Aucun item à importer.");
    process.exit(1);
  }

  const created = await createExpenses(items);
  console.log(`Importé ${created.length} dépense(s):`);
  for (const row of created) {
    console.log(
      `  - ${row.date} | ${row.amount.toFixed(2)}$ | ${row.description} [${row.categoryName}${row.subcategoryName ? " / " + row.subcategoryName : ""}]`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
