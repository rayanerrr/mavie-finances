import { NextRequest, NextResponse } from "next/server";
import {
  listMonths,
  monthTotal,
  totalsByCategory,
  totalsBySubcategory,
} from "@/lib/expenses";
import { currentMonthKey } from "@/lib/money";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const month =
    request.nextUrl.searchParams.get("month") ?? currentMonthKey();
  const categoryIdRaw = request.nextUrl.searchParams.get("categoryId");
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : undefined;

  return NextResponse.json({
    month,
    months: listMonths(),
    total: monthTotal(month),
    byCategory: totalsByCategory(month),
    bySubcategory: totalsBySubcategory(month, categoryId),
  });
}
