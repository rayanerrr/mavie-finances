import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, subcategories } from "@/db/schema";
import { colorForCategory } from "@/lib/classify";
import { slugify } from "@/lib/slug";

export async function getOrCreateCategory(
  name: string,
  opts?: { color?: string; kind?: "essential" | "discretionary" | "income" },
) {
  const trimmed = name.trim();
  const slug = slugify(trimmed);

  const existing = db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .get();

  if (existing) return existing;

  return db
    .insert(categories)
    .values({
      name: trimmed,
      slug,
      color: opts?.color ?? colorForCategory(trimmed),
      kind: opts?.kind ?? "essential",
    })
    .returning()
    .get();
}

export async function getOrCreateSubcategory(categoryId: number, name: string) {
  const trimmed = name.trim();
  const slug = slugify(trimmed);

  const existing = db
    .select()
    .from(subcategories)
    .where(
      and(
        eq(subcategories.categoryId, categoryId),
        eq(subcategories.slug, slug),
      ),
    )
    .get();

  if (existing) return existing;

  return db
    .insert(subcategories)
    .values({ categoryId, name: trimmed, slug })
    .returning()
    .get();
}

export function listCategoriesWithSubs() {
  const cats = db.select().from(categories).all();
  const subs = db.select().from(subcategories).all();

  return cats.map((category) => ({
    ...category,
    subcategories: subs.filter((sub) => sub.categoryId === category.id),
  }));
}
