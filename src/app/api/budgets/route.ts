import { NextRequest, NextResponse } from "next/server";
import { listBudgets, upsertBudget } from "@/lib/budgets";
import { currentMonthKey } from "@/lib/money";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const month =
    request.nextUrl.searchParams.get("month") ?? currentMonthKey();
  return NextResponse.json({ month, budgets: listBudgets(month) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.categoryId || !body.monthKey || typeof body.amount !== "number") {
    return NextResponse.json(
      { error: "categoryId, monthKey, amount requis" },
      { status: 400 },
    );
  }
  const budget = upsertBudget({
    categoryId: Number(body.categoryId),
    monthKey: body.monthKey,
    amount: body.amount,
  });
  return NextResponse.json({ budget }, { status: 201 });
}
