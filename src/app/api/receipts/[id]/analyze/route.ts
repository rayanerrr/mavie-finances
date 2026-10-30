import { NextRequest, NextResponse } from "next/server";
import { analyzeReceipt, getReceipt } from "@/lib/receipts";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  const body = await request.json();
  if (!Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json({ error: "items[] requis" }, { status: 400 });
  }

  try {
    analyzeReceipt(Number(id), body);
    const receipt = getReceipt(Number(id));
    return NextResponse.json({ receipt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 400 },
    );
  }
}
