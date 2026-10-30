import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, expenses } from "@/db/schema";
import { previousMonthKey } from "@/lib/money";

function monthsBack(endMonth: string, count: number): string[] {
  const keys: string[] = [];
  let key = endMonth;
  for (let i = 0; i < count; i += 1) {
    keys.unshift(key);
    key = previousMonthKey(key);
  }
  return keys;
}

export function monthlyEvolution(endMonth: string, monthsCount = 6) {
  const monthKeys = monthsBack(endMonth, monthsCount);

  const series = monthKeys.map((monthKey) => {
    const rows = db
      .select({
        categoryName: categories.name,
        categoryColor: categories.color,
        total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .innerJoin(categories, eq(expenses.categoryId, categories.id))
      .where(and(eq(expenses.monthKey, monthKey), eq(expenses.type, "expense")))
      .groupBy(categories.name, categories.color)
      .all();

    const byCategory = rows.map((r) => ({
      category: r.categoryName,
      total: Number(r.total),
      color: r.categoryColor,
    }));

    return {
      monthKey,
      total: byCategory.reduce((sum, c) => sum + c.total, 0),
      byCategory,
    };
  });

  const categoryNames = Array.from(
    new Set(series.flatMap((m) => m.byCategory.map((c) => c.category))),
  );

  return { monthKeys, categoryNames, series };
}
