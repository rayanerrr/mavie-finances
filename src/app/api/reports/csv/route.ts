import { NextRequest, NextResponse } from "next/server";
import { listExpenses } from "@/lib/expenses";
import { currentMonthKey } from "@/lib/money";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const month =
    request.nextUrl.searchParams.get("month") ?? currentMonthKey();
  const rows = listExpenses({ month });

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
