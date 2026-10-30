import { db } from "@/db";
import { categoryRules } from "@/db/schema";
export function normalizeDescription(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z\s]/g," ").replace(/\s+/g," ").trim();
}
export function learnRule(description: string, store: string | null, category: string, subcategory: string | null) {
  const pattern = normalizeDescription(description);
  if (!pattern) return;
  const merchant = store ? normalizeDescription(store) : null;
  db.$client.prepare(`INSERT INTO category_rules(pattern,merchant_key,category,subcategory,hits,updated_at)
    VALUES(?,?,?,?,1,datetime('now')) ON CONFLICT DO UPDATE SET category=excluded.category,subcategory=excluded.subcategory,hits=category_rules.hits+1,updated_at=excluded.updated_at`).run(pattern,merchant,category,subcategory);
}
export function applyRules<T extends {description:string; rawText?:string|null; category:string; subcategory:string|null}>(items:T[], store:string|null):T[] {
  const rules = db.select().from(categoryRules).all();
  const merchant = store ? normalizeDescription(store) : null;
  return items.map(item => {
    const patterns = [normalizeDescription(item.description),normalizeDescription(item.rawText ?? "")];
    const candidates = rules.filter(r=>patterns.includes(r.pattern));
    const rule = candidates.find(r=>r.merchantKey===merchant) ?? candidates.find(r=>r.merchantKey===null);
    return rule ? {...item,category:rule.category,subcategory:rule.subcategory} : item;
  });
}
