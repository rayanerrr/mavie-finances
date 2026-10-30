import { NextRequest, NextResponse } from "next/server";
import { createAccount, listAccounts } from "@/lib/accounts";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ accounts: listAccounts() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name || !body.type) {
    return NextResponse.json(
      { error: "name et type requis" },
      { status: 400 },
    );
  }
  const account = createAccount({
    name: body.name,
    type: body.type,
    color: body.color,
  });
  return NextResponse.json({ account }, { status: 201 });
}
