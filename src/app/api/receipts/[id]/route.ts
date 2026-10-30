import { NextRequest, NextResponse } from "next/server";
import { getReceipt } from "@/lib/receipts";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  const receipt = getReceipt(Number(id));
  if (!receipt) {
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }
  return NextResponse.json(receipt);
}
