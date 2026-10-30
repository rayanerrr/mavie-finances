import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, expenses, subcategories } from "@/db/schema";
import {
  getOrCreateCategory,
  getOrCreateSubcategory,
} from "@/lib/categories";
import { merchantKeyFromStore } from "@/lib/merchants";
import { monthKeyFromDate } from "@/lib/money";
import { matchRule } from "@/lib/category-admin";
import { slugify } from "@/lib/slug";

export type ExpenseInput = {
  date: string;
  amount: number;
  description: string;
  store?: string | null;
  person?: string | null;
  category: string;
  subcategory?: string | null;
  notes?: string | null;
  source?: "receipt" | "text" | "phone";
  monthKey?: string;
  type?: "expense" | "income";
  accountId?: number | null;
  receiptId?: number | null;
  merchantKey?: string | null;
  categoryKind?: "essential" | "discretionary" | "income";
};

export type ExpenseFilters = {
  month?: string;
  categoryId?: number;
  subcategoryId?: number;
  accountId?: number;
  person?: string;
  q?: string;
  type?: "expense" | "income";
  source?: "receipt" | "text" | "recurring";
  limit?: number;
};

export function listExpenses(filters: ExpenseFilters = {}) {
  const conditions = [];

  if (filters.month) conditions.push(eq(expenses.monthKey, filters.month));
  if (filters.categoryId) conditions.push(eq(expenses.categoryId, filters.categoryId));
  if (filters.subcategoryId) conditions.push(eq(expenses.subcategoryId, filters.subcategoryId));
  if (filters.accountId) conditions.push(eq(expenses.accountId, filters.accountId));
  if (filters.person) conditions.push(eq(expenses.person, filters.person));
  if (filters.type) conditions.push(eq(expenses.type, filters.type));
  if (filters.source) conditions.push(eq(expenses.source, filters.source));
  if (filters.q) {
    conditions.push(
      or(
        like(expenses.description, `%${filters.q}%`),
        like(expenses.store, `%${filters.q}%`),
      ),
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const query = db
    .select({
      id: expenses.id,
      date: expenses.date,
      amount: expenses.amount,
      description: expenses.description,
      store: expenses.store,
      person: expenses.person,
      monthKey: expenses.monthKey,
      notes: expenses.notes,
      source: expenses.source,
      type: expenses.type,
      merchantKey: expenses.merchantKey,
      createdAt: expenses.createdAt,
      categoryId: expenses.categoryId,
      subcategoryId: expenses.subcategoryId,
      accountId: expenses.accountId,
      receiptId: expenses.receiptId,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryKind: categories.kind,
      subcategoryName: subcategories.name,
      accountName: accounts.name,
      accountColor: accounts.color,
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .leftJoin(subcategories, eq(expenses.subcategoryId, subcategories.id))
    .leftJoin(accounts, eq(expenses.accountId, accounts.id))
    .where(where)
    .orderBy(desc(expenses.date), desc(expenses.id));

  if (filters.limit) {
    return query.limit(filters.limit).all();
  }
  return query.all();
}

export async function createExpenses(items: ExpenseInput[]) {
  const created = [];

  for (let item of items) {
    const type = item.type ?? "expense";
    // Règle par mot-clé du gestionnaire de catégories quand rien n'est choisi.
    if (type === "expense" && (!item.category?.trim() || slugify(item.category) === "autres")) {
      const forced = matchRule(item.description, item.store);
      if (forced) item = { ...item, category: forced.category, subcategory: forced.subcategory ?? item.subcategory };
    }
    const category = await getOrCreateCategory(item.category?.trim() || "Autres", {
      kind:
        item.categoryKind ??
        (type === "income" ? "income" : undefined),
    });
    const subcategory = item.subcategory
      ? await getOrCreateSubcategory(category.id, item.subcategory)
      : null;

    const monthKey = item.monthKey ?? monthKeyFromDate(item.date);
    const merchantKey =
      item.merchantKey ?? merchantKeyFromStore(item.store) ?? null;

    const row = db
      .insert(expenses)
      .values({
        date: item.date,
        amount: item.amount,
        description: item.description,
        store: item.store ?? null,
        person: item.person ?? null,
        monthKey,
        categoryId: category.id,
        subcategoryId: subcategory?.id ?? null,
        accountId: item.accountId ?? null,
        receiptId: item.receiptId ?? null,
        type,
        merchantKey,
        notes: item.notes ?? null,
        source: item.source ?? "text",
      })
      .returning()
      .get();

    created.push({
      ...row,
      categoryName: category.name,
      subcategoryName: subcategory?.name ?? null,
    });
  }

  return created;
}

export function listMonths() {
  return db
    .selectDistinct({ monthKey: expenses.monthKey })
    .from(expenses)
    .orderBy(desc(expenses.monthKey))
    .all()
    .map((row) => row.monthKey);
}

export function totalsByCategory(monthKey: string, type: "expense" | "income" = "expense") {
  return db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryKind: categories.kind,
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(expenses)
    .innerJoin(categories, eq(expenses.categoryId, categories.id))
    .where(and(eq(expenses.monthKey, monthKey), eq(expenses.type, type)))
    .groupBy(categories.id, categories.name, categories.color, categories.kind)
    .orderBy(sql`sum(${expenses.amount}) desc`)
    .all();
}

export function totalsBySubcategory(
  monthKey: string,
  categoryId?: number,
  type: "expense" | "income" = "expense",
) {
  const conditions = [eq(expenses.monthKey, monthKey), eq(expenses.type, type)];
  if (categoryId) conditions.push(eq(expenses.categoryId, categoryId));

  return db
    .select({
      subcategoryId: subcategories.id,
      subcategoryName: subcategories.name,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(expenses)
    .innerJoin(categories, eq(expenses.categoryId, categories.id))
    .leftJoin(subcategories, eq(expenses.subcategoryId, subcategories.id))
    .where(and(...conditions))
    .groupBy(
      subcategories.id,
      subcategories.name,
      categories.id,
      categories.name,
      categories.color,
    )
    .orderBy(sql`sum(${expenses.amount}) desc`)
    .all();
}

export function monthTotal(monthKey: string, type: "expense" | "income" = "expense") {
  const row = db
    .select({
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(expenses)
    .where(and(eq(expenses.monthKey, monthKey), eq(expenses.type, type)))
    .get();

  return row ?? { total: 0, count: 0 };
}
