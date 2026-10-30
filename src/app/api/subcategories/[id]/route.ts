import { NextRequest, NextResponse } from "next/server";
import { deleteSubcategory, renameSubcategory } from "@/lib/category-admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const body = await request.json();
    return NextResponse.json({ subcategory: renameSubcategory(Number(id), String(body.name ?? "")) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  deleteSubcategory(Number(id));
  return NextResponse.json({ ok: true });
}
