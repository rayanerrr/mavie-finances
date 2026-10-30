import { NextRequest, NextResponse } from "next/server";
import { getReceipt, updateReceiptItem } from "@/lib/receipts";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  const body = await request.json();
  if (!body.itemId) {
    return NextResponse.json({ error: "itemId requis" }, { status: 400 });
  }
  updateReceiptItem(Number(body.itemId), body);
  return NextResponse.json(getReceipt(Number(id)));
}
