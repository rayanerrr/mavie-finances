import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ settings: getAllSettings() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.key || body.value === undefined) {
    return NextResponse.json({ error: "key et value requis" }, { status: 400 });
  }
  const row = setSetting(String(body.key), String(body.value));
  return NextResponse.json({ setting: row });
}
