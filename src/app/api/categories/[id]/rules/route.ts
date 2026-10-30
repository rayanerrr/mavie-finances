import { NextRequest, NextResponse } from "next/server";
import { addRule, deleteRule } from "@/lib/category-admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const body = await request.json();
    const rule = addRule(
      Number(id),
      String(body.keyword ?? ""),
      body.subcategoryId ? Number(body.subcategoryId) : null,
    );
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const ruleId = request.nextUrl.searchParams.get("ruleId");
  if (!ruleId) return NextResponse.json({ error: "ruleId requis" }, { status: 400 });
  deleteRule(Number(ruleId));
  return NextResponse.json({ ok: true });
}
