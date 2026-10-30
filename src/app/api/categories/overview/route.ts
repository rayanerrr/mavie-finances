import { NextRequest, NextResponse } from "next/server";
import { categoryOverview } from "@/lib/category-admin";
import { currentMonthKey } from "@/lib/money";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? currentMonthKey();
  return NextResponse.json(categoryOverview(month));
}
