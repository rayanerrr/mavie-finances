import { NextRequest, NextResponse } from "next/server";
import { currentMonthKey } from "@/lib/money";
import { subcategoryAnalytics } from "@/lib/subcategory-analytics";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const categoryId = Number(params.get("categoryId"));
  if (!categoryId) return NextResponse.json({ error: "categoryId requis" }, { status: 400 });
  const data = subcategoryAnalytics(categoryId, params.get("month") ?? currentMonthKey());
  if (!data) return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
  return NextResponse.json(data);
}
