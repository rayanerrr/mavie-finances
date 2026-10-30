import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  budgets,
  categories,
  keywordRules,
  expenses,
  subcategories,
} from "@/db/schema";
import { getOrCreateCategory } from "@/lib/categories";
import { iconForCategory, isIconKey } from "@/lib/classify";
import { previousMonthKey } from "@/lib/money";
import { slugify } from "@/lib/slug";

export type CategoryKind = "essential" | "discretionary" | "income";

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function monthExpenses(monthKeys: string[]) {
  return db
    .select({
      amount: expenses.amount,
      monthKey: expenses.monthKey,
      categoryId: expenses.categoryId,
      subcategoryId: expenses.subcategoryId,
      type: expenses.type,
    })
    .from(expenses)
    .where(inArray(expenses.monthKey, monthKeys))
    .all();
}

export function categoryOverview(monthKey: string) {
  const prevKey = previousMonthKey(monthKey);
  const cats = db.select().from(categories).all();
  const subs = db.select().from(subcategories).all();
  const rows = monthExpenses([monthKey, prevKey]);

  const list = cats.map((cat) => {
    const relevantType = cat.kind === "income" ? "income" : "expense";
    const mine = rows.filter((r) => r.categoryId === cat.id && r.type === relevantType);
    const current = mine.filter((r) => r.monthKey === monthKey);
    const previous = mine.filter((r) => r.monthKey === prevKey);
    const total = round2(current.reduce((s, r) => s + r.amount, 0));
    const prevTotal = round2(previous.reduce((s, r) => s + r.amount, 0));
    return {
      id: cat.id,
      name: cat.name,
      color: cat.color,
      kind: cat.kind as CategoryKind,
      icon: isIconKey(cat.icon) ? cat.icon : iconForCategory(cat.name),
      archived: cat.archived === 1,
      createdAt: cat.createdAt,
      total,
      prevTotal,
      deltaPct: pctChange(total, prevTotal),
      txCount: current.length,
      prevTxCount: previous.length,
      subCount: subs.filter((s) => s.categoryId === cat.id).length,
    };
  });

  const active = list.filter((c) => !c.archived);
  const activeIds = new Set(active.map((c) => c.id));
  const createdThisMonth = (createdAt: string) => createdAt.slice(0, 7) === monthKey;
  const uncategorized = rows.filter(
    (r) => r.monthKey === monthKey && r.type === "expense" && r.subcategoryId == null,
  ).length;

  return {
    categories: list,
    stats: {
      categoryCount: active.length,
      newCategories: active.filter((c) => createdThisMonth(c.createdAt)).length,
      subCount: subs.filter((s) => activeIds.has(s.categoryId)).length,
      newSubs: subs.filter((s) => activeIds.has(s.categoryId) && createdThisMonth(s.createdAt))
        .length,
      essentialCount: active.filter((c) => c.kind === "essential").length,
      discretionaryCount: active.filter((c) => c.kind === "discretionary").length,
      uncategorized,
    },
  };
}

export function categoryDetail(categoryId: number, monthKey: string) {
  const subs = db
    .select()
    .from(subcategories)
    .where(eq(subcategories.categoryId, categoryId))
    .all();
  const rows = monthExpenses([monthKey]).filter((r) => r.categoryId === categoryId);
  const rules = db
    .select()
    .from(keywordRules)
    .where(eq(keywordRules.categoryId, categoryId))
    .all();

  const subStats = subs
    .map((sub) => {
      const mine = rows.filter((r) => r.subcategoryId === sub.id);
      return {
        id: sub.id,
        name: sub.name,
        total: round2(mine.reduce((s, r) => s + r.amount, 0)),
        txCount: mine.length,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "fr"));

  return {
    subcategories: subStats,
    rules: rules.map((rule) => ({
      id: rule.id,
      keyword: rule.keyword,
      subcategoryId: rule.subcategoryId,
      subcategoryName: subs.find((s) => s.id === rule.subcategoryId)?.name ?? null,
    })),
  };
}

export function updateCategory(
  id: number,
  patch: { name?: string; color?: string; kind?: string; icon?: string; archived?: boolean },
) {
  const values: Partial<typeof categories.$inferInsert> = {};
  if (patch.name?.trim()) {
    const name = patch.name.trim();
    const clash = db.select().from(categories).where(eq(categories.slug, slugify(name))).get();
    if (clash && clash.id !== id) {
      throw new Error(`La catégorie « ${clash.name} » existe déjà. Utilisez « Fusionner ».`);
    }
    values.name = name;
    values.slug = slugify(name);
  }
  if (patch.color) values.color = patch.color;
  if (patch.kind && ["essential", "discretionary", "income"].includes(patch.kind)) {
    values.kind = patch.kind;
  }
  if (isIconKey(patch.icon)) values.icon = patch.icon;
  if (typeof patch.archived === "boolean") values.archived = patch.archived ? 1 : 0;

  return db.update(categories).set(values).where(eq(categories.id, id)).returning().get();
}

export function mergeCategory(sourceId: number, targetId: number) {
  if (sourceId === targetId) throw new Error("Choisissez une autre catégorie.");
  const target = db.select().from(categories).where(eq(categories.id, targetId)).get();
  if (!target) throw new Error("Catégorie cible introuvable.");

  db.transaction((tx) => {
    const sourceSubs = tx
      .select()
      .from(subcategories)
      .where(eq(subcategories.categoryId, sourceId))
      .all();
    const targetSubs = tx
      .select()
      .from(subcategories)
      .where(eq(subcategories.categoryId, targetId))
      .all();

    for (const sub of sourceSubs) {
      const twin = targetSubs.find((t) => t.slug === sub.slug);
      if (twin) {
        tx.update(expenses).set({ subcategoryId: twin.id }).where(eq(expenses.subcategoryId, sub.id)).run();
        tx.update(keywordRules)
          .set({ subcategoryId: twin.id })
          .where(eq(keywordRules.subcategoryId, sub.id))
          .run();
        tx.delete(subcategories).where(eq(subcategories.id, sub.id)).run();
      } else {
        tx.update(subcategories).set({ categoryId: targetId }).where(eq(subcategories.id, sub.id)).run();
      }
    }

    tx.update(expenses).set({ categoryId: targetId }).where(eq(expenses.categoryId, sourceId)).run();
    tx.update(keywordRules)
      .set({ categoryId: targetId })
      .where(eq(keywordRules.categoryId, sourceId))
      .run();

    const sourceBudgets = tx.select().from(budgets).where(eq(budgets.categoryId, sourceId)).all();
    for (const budget of sourceBudgets) {
      const existing = tx
        .select()
        .from(budgets)
        .where(and(eq(budgets.categoryId, targetId), eq(budgets.monthKey, budget.monthKey)))
        .get();
      if (existing) {
        tx.update(budgets)
          .set({ amount: existing.amount + budget.amount })
          .where(eq(budgets.id, existing.id))
          .run();
        tx.delete(budgets).where(eq(budgets.id, budget.id)).run();
      } else {
        tx.update(budgets).set({ categoryId: targetId }).where(eq(budgets.id, budget.id)).run();
      }
    }

    tx.delete(categories).where(eq(categories.id, sourceId)).run();
  });

  return target;
}

export async function deleteCategory(id: number) {
  const cat = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!cat) throw new Error("Catégorie introuvable.");
  if (cat.slug === "autres") throw new Error("« Autres » sert de catégorie de secours.");

  const used = db.select({ id: expenses.id }).from(expenses).where(eq(expenses.categoryId, id)).get();
  if (!used) {
    db.transaction((tx) => {
      tx.delete(keywordRules).where(eq(keywordRules.categoryId, id)).run();
      tx.delete(budgets).where(eq(budgets.categoryId, id)).run();
      tx.delete(subcategories).where(eq(subcategories.categoryId, id)).run();
      tx.delete(categories).where(eq(categories.id, id)).run();
    });
    return { movedTo: null };
  }

  const fallback = await getOrCreateCategory("Autres", { kind: "discretionary" });
  mergeCategory(id, fallback.id);
  return { movedTo: fallback.name };
}

export function renameSubcategory(id: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nom requis.");
  const sub = db.select().from(subcategories).where(eq(subcategories.id, id)).get();
  if (!sub) throw new Error("Sous-catégorie introuvable.");
  const slug = slugify(trimmed);
  const clash = db
    .select()
    .from(subcategories)
    .where(and(eq(subcategories.categoryId, sub.categoryId), eq(subcategories.slug, slug)))
    .get();
  if (clash && clash.id !== id) {
    db.transaction((tx) => {
      tx.update(expenses).set({ subcategoryId: clash.id }).where(eq(expenses.subcategoryId, id)).run();
      tx.update(keywordRules)
        .set({ subcategoryId: clash.id })
        .where(eq(keywordRules.subcategoryId, id))
        .run();
      tx.delete(subcategories).where(eq(subcategories.id, id)).run();
    });
    return clash;
  }
  return db
    .update(subcategories)
    .set({ name: trimmed, slug })
    .where(eq(subcategories.id, id))
    .returning()
    .get();
}

export function deleteSubcategory(id: number) {
  db.transaction((tx) => {
    tx.update(expenses).set({ subcategoryId: null }).where(eq(expenses.subcategoryId, id)).run();
    tx.update(keywordRules)
      .set({ subcategoryId: null })
      .where(eq(keywordRules.subcategoryId, id))
      .run();
    tx.delete(subcategories).where(eq(subcategories.id, id)).run();
  });
}

export function addRule(categoryId: number, keyword: string, subcategoryId?: number | null) {
  const trimmed = keyword.trim();
  if (!trimmed) throw new Error("Mot-clé requis.");
  return db
    .insert(keywordRules)
    .values({ categoryId, keyword: trimmed, subcategoryId: subcategoryId ?? null })
    .returning()
    .get();
}

export function deleteRule(id: number) {
  db.delete(keywordRules).where(eq(keywordRules.id, id)).run();
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Returns the category/subcategory names forced by the first matching rule, if any. */
export function matchRule(description: string, store?: string | null) {
  const haystack = normalize(`${description} ${store ?? ""}`);
  const rules = db.select().from(keywordRules).all();
  const rule = rules.find((r) => haystack.includes(normalize(r.keyword)));
  if (!rule) return null;
  const cat = db.select().from(categories).where(eq(categories.id, rule.categoryId)).get();
  if (!cat) return null;
  const sub = rule.subcategoryId
    ? db.select().from(subcategories).where(eq(subcategories.id, rule.subcategoryId)).get()
    : null;
  return { category: cat.name, subcategory: sub?.name ?? null };
}