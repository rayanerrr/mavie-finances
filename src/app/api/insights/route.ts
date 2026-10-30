import { NextRequest, NextResponse } from "next/server";
import { buildInsights } from "@/lib/insights";
import { currentMonthKey } from "@/lib/money";
import {
  listMonths,
  monthTotal,
  totalsByCategory,
  totalsBySubcategory,
} from "@/lib/expenses";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const month =
    request.nextUrl.searchParams.get("month") ?? currentMonthKey();
  const categoryIdRaw = request.nextUrl.searchParams.get("categoryId");
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : undefined;

  const insights = buildInsights(month);
  const byCategory = totalsByCategory(month, "expense").map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.categoryName,
    total: Number(c.total),
    count: Number(c.count),
    color: c.categoryColor,
    kind: c.categoryKind,
  }));
  const bySubcategory = totalsBySubcategory(month, categoryId, "expense").map(
    (s) => ({
      subcategoryId: s.subcategoryId,
      subcategoryName: s.subcategoryName ?? "Sans sous-catégorie",
      categoryId: s.categoryId,
      categoryName: s.categoryName,
      total: Number(s.total),
      count: Number(s.count),
      color: s.categoryColor,
    }),
  );
  const total = monthTotal(month, "expense");

  return NextResponse.json({
    month,
    total: Number(total.total),
    count: Number(total.count),
    months: listMonths(),
    byCategory,
    bySubcategory,
    insights,
  });
}
