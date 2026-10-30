import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";

export function listGoals() {
  return db.select().from(goals).orderBy(desc(goals.createdAt)).all();
}

export function createGoal(input: {
  title: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: string | null;
}) {
  return db
    .insert(goals)
    .values({
      title: input.title.trim(),
      targetAmount: input.targetAmount,
      currentAmount: input.currentAmount ?? 0,
      deadline: input.deadline ?? null,
    })
    .returning()
    .get();
}

export function updateGoal(
  id: number,
  patch: Partial<{
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string | null;
  }>,
) {
  return db.update(goals).set(patch).where(eq(goals.id, id)).returning().get();
}

export function deleteGoal(id: number) {
  return db.delete(goals).where(eq(goals.id, id)).run();
}
