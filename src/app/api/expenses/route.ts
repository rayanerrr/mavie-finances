import { NextRequest, NextResponse } from "next/server";
import { createExpenses, listExpenses, type ExpenseInput } from "@/lib/expenses";
import { schedulePhoneSummary } from "@/lib/phone-summary";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const month = searchParams.get("month") ?? undefined;
  const person = searchParams.get("person") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const type = (searchParams.get("type") as "expense" | "income" | null) ?? undefined;
  const categoryIdRaw = searchParams.get("categoryId");
  const accountIdRaw = searchParams.get("accountId");
  const limitRaw = searchParams.get("limit");

  const rows = listExpenses({
    month,
    person,
    q,
    type,
    categoryId: categoryIdRaw ? Number(categoryIdRaw) : undefined,
    accountId: accountIdRaw ? Number(accountIdRaw) : undefined,
    limit: limitRaw ? Number(limitRaw) : undefined,
  });

  return NextResponse.json({ expenses: rows });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const items: ExpenseInput[] = Array.isArray(body)
    ? body
    : Array.isArray(body.items)
      ? body.items
      : [body];

  if (!items.length) {
    return NextResponse.json({ error: "Aucun item" }, { status: 400 });
  }

  for (const item of items) {
    if (
      !item.date ||
      typeof item.amount !== "number" ||
      !item.description ||
      !item.category
    ) {
      return NextResponse.json(
        { error: "Chaque item nécessite date, amount, description, category" },
        { status: 400 },
      );
    }
  }

  const created = await createExpenses(items);
  schedulePhoneSummary();
  return NextResponse.json({ created, count: created.length }, { status: 201 });
}
