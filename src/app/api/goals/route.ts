import { NextRequest, NextResponse } from "next/server";
import { createGoal, deleteGoal, listGoals, updateGoal } from "@/lib/goals";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ goals: listGoals() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.title || typeof body.targetAmount !== "number") {
    return NextResponse.json(
      { error: "title et targetAmount requis" },
      { status: 400 },
    );
  }
  const goal = createGoal(body);
  return NextResponse.json({ goal }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }
  const goal = updateGoal(Number(body.id), body);
  return NextResponse.json({ goal });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }
  deleteGoal(Number(id));
  return NextResponse.json({ ok: true });
}
