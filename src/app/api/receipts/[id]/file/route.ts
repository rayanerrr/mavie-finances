import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getReceipt } from "@/lib/receipts";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  const receipt = getReceipt(Number(id));
  if (!receipt) {
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }

  const abs = path.join(process.cwd(), receipt.path);
  if (!fs.existsSync(abs)) {
    return NextResponse.json({ error: "fichier manquant" }, { status: 404 });
  }

  const buffer = fs.readFileSync(abs);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": receipt.mime,
      "Cache-Control": "no-store",
    },
  });
}
