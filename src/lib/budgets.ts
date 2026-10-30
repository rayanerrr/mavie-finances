import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import { totalsByCategory } from "@/lib/expenses";

export function listBudgets(monthKey: string) {
  const rows = db
    .select({
      id: budgets.id,
      categoryId: budgets.categoryId,
      monthKey: budgets.monthKey,
      amount: budgets.amount,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id))
    .where(eq(budgets.monthKey, monthKey))
    .all();

  const spent = totalsByCategory(monthKey, "expense");
  const spentMap = new Map(spent.map((s) => [s.categoryId, Number(s.total)]));

  return rows.map((row) => {
    const actual = spentMap.get(row.categoryId) ?? 0;
    return {
      ...row,
      actual,
      remaining: row.amount - actual,
      pct: row.amount > 0 ? (actual / row.amount) * 100 : 0,
    };
  });
}

export function upsertBudget(input: {
  categoryId: number;
  monthKey: string;
  amount: number;
}) {
  const existing = db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.categoryId, input.categoryId),
        eq(budgets.monthKey, input.monthKey),
      ),
    )
    .get();

  if (existing) {
    return db
      .update(budgets)
      .set({ amount: input.amount })
      .where(eq(budgets.id, existing.id))
      .returning()
      .get();
  }

  return db.insert(budgets).values(input).returning().get();
}
