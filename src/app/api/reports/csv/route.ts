import { NextRequest, NextResponse } from "next/server";
import { listExpenses } from "@/lib/expenses";
import { currentMonthKey } from "@/lib/money";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const month =
    request.nextUrl.searchParams.get("month") ?? currentMonthKey();
  const type = request.nextUrl.searchParams.get("type") as "expense" | "income" | undefined;
  const source = request.nextUrl.searchParams.get("source") as "receipt" | "text" | "recurring" | undefined;
  const categoryId = request.nextUrl.searchParams.get("categoryId");
  const subcategoryId = request.nextUrl.searchParams.get("subcategoryId");
  const rows = listExpenses({ month, type, source, categoryId: categoryId ? Number(categoryId) : undefined, subcategoryId: subcategoryId ? Number(subcategoryId) : undefined, q: request.nextUrl.searchParams.get("q") ?? undefined });

  const header = [
    "date",
    "description",
    "store",
    "category",
    "subcategory",
    "amount",
    "type",
    "person",
    "account",
  ];

  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.date,
        csv(r.description),
        csv(r.store ?? ""),
        csv(r.categoryName ?? ""),
        csv(r.subcategoryName ?? ""),
        r.amount,
        r.type,
        csv(r.person ?? ""),
        csv(r.accountName ?? ""),
      ].join(","),
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mavie-${month}.csv"`,
    },
  });
}

function csv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
