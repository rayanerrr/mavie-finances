import { NextRequest, NextResponse } from "next/server";
import { mergeCategory } from "@/lib/category-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const target = mergeCategory(Number(id), Number(body.targetId));
    return NextResponse.json({ target });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
