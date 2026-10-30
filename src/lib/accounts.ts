import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, expenses } from "@/db/schema";

export function listAccounts() {
  const rows = db.select().from(accounts).all();
  return rows.map((account) => {
    const income = db
      .select({
        total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(
        sql`${expenses.accountId} = ${account.id} AND ${expenses.type} = 'income'`,
      )
      .get();
    const expense = db
      .select({
        total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(
        sql`${expenses.accountId} = ${account.id} AND ${expenses.type} = 'expense'`,
      )
      .get();

    const incomeTotal = Number(income?.total ?? 0);
    const expenseTotal = Number(expense?.total ?? 0);

    return {
      ...account,
      incomeTotal,
      expenseTotal,
      balance: incomeTotal - expenseTotal,
    };
  });
}

export function createAccount(input: {
  name: string;
  type: string;
  color?: string;
}) {
  return db
    .insert(accounts)
    .values({
      name: input.name.trim(),
      type: input.type,
      color: input.color ?? "#7c5cff",
    })
    .returning()
    .get();
}

export function getDefaultAccountId() {
  const first = db.select().from(accounts).get();
  return first?.id ?? null;
}

export function getAccountById(id: number) {
  return db.select().from(accounts).where(eq(accounts.id, id)).get();
}
