import { NextRequest, NextResponse } from "next/server";
import { categoryDetail, deleteCategory, updateCategory } from "@/lib/category-admin";
import { currentMonthKey } from "@/lib/money";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Erreur inconnue";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const month = request.nextUrl.searchParams.get("month") ?? currentMonthKey();
  return NextResponse.json(categoryDetail(Number(id), month));
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const body = await request.json();
    return NextResponse.json({ category: updateCategory(Number(id), body) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    return NextResponse.json(await deleteCategory(Number(id)));
  } catch (error) {
    return fail(error);
  }
}
