import { supportedMimes } from "@/lib/gemini";
import { apiError } from "@/lib/api";
import { after, NextRequest, NextResponse } from "next/server";
import { createReceiptFromFile, listReceipts, markAnalyzing, runReceiptAnalysis } from "@/lib/receipts";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  return NextResponse.json({ receipts: listReceipts(status ?? undefined) });
}

export async function POST(request: NextRequest) {
  try {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file requis" }, { status: 400 });
  }

  if (!supportedMimes.includes(file.type)) throw new Error("Format non pris en charge");
  const buffer = Buffer.from(await file.arrayBuffer());
  const person = form.get("person");
  const store = form.get("store");
  const accountIdRaw = form.get("accountId");
  const notes = form.get("notes");

  const receipt = createReceiptFromFile({
    filename: file.name,
    mime: file.type || "application/octet-stream",
    buffer,
    person: typeof person === "string" ? person : null,
    store: typeof store === "string" ? store : null,
    accountId: typeof accountIdRaw === "string" ? Number(accountIdRaw) : null,
    notes: typeof notes === "string" ? notes : null,
  });

  const analyzing = markAnalyzing(receipt.id);
  after(()=>runReceiptAnalysis(receipt.id));
  return NextResponse.json({ receipt:analyzing }, { status: 201 });
  } catch(error) { return apiError(error); }
}
