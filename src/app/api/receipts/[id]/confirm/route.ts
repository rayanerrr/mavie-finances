import { NextRequest, NextResponse } from "next/server";
import { confirmReceipt } from "@/lib/receipts";
import { schedulePhoneSummary } from "@/lib/phone-summary";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  try {
    const result = await confirmReceipt(Number(id));
    schedulePhoneSummary();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 400 },
    );
  }
}
