import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, subcategories } from "@/db/schema";
import {
  getOrCreateCategory,
  getOrCreateSubcategory,
  listCategoriesWithSubs,
} from "@/lib/categories";
import { colorForCategory, isIconKey } from "@/lib/classify";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ categories: listCategoriesWithSubs() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.subcategory && body.categoryId) {
    const sub = await getOrCreateSubcategory(
      Number(body.categoryId),
      String(body.subcategory),
    );
    return NextResponse.json({ subcategory: sub }, { status: 201 });
  }

  if (!body.name) {
    return NextResponse.json({ error: "name requis" }, { status: 400 });
  }

  const category = await getOrCreateCategory(String(body.name), {
    color: body.color,
    kind: body.kind,
    icon: isIconKey(body.icon) ? body.icon : undefined,
  });

  if (Array.isArray(body.subcategories)) {
    for (const name of body.subcategories) {
      await getOrCreateSubcategory(category.id, String(name));
    }
  }

  return NextResponse.json({ category }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.name) {
    patch.name = body.name;
    patch.slug = slugify(body.name);
  }
  if (body.color) patch.color = body.color;
  if (body.kind) patch.kind = body.kind;
  if (!body.color && body.name) patch.color = colorForCategory(body.name);

  const updated = db
    .update(categories)
    .set(patch)
    .where(eq(categories.id, Number(body.id)))
    .returning()
    .get();

  return NextResponse.json({ category: updated });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("subcategoryId");
  if (id) {
    db.delete(subcategories).where(eq(subcategories.id, Number(id))).run();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "non supporté" }, { status: 400 });
}
