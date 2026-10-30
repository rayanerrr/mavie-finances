import { AppShell } from "@/components/AppShell";
import { SubcategoryExplorer } from "@/components/SubcategoryExplorer";
import { currentMonthKey } from "@/lib/money";

export default async function SousCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string; month?: string }>;
}) {
  const params = await searchParams;
  const categoryId = Number(params.categoryId) || null;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonthKey();
  return (
    <AppShell>
      <SubcategoryExplorer initialCategoryId={categoryId} initialMonth={month} />
    </AppShell>
  );
}
