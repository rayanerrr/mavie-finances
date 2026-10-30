import { desc, eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { db, paths } from "@/db";
import { receiptItems, receipts } from "@/db/schema";
import { createExpenses } from "@/lib/expenses";
import { getDefaultAccountId } from "@/lib/accounts";

export function listReceipts(status?: string) {
  const rows = status
    ? db
        .select()
        .from(receipts)
        .where(eq(receipts.status, status))
        .orderBy(desc(receipts.createdAt))
        .all()
    : db.select().from(receipts).orderBy(desc(receipts.createdAt)).all();

  return rows.map((receipt) => ({
    ...receipt,
    items: db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, receipt.id))
      .all(),
  }));
}

export function getReceipt(id: number) {
  const receipt = db.select().from(receipts).where(eq(receipts.id, id)).get();
  if (!receipt) return null;
  const items = db
    .select()
    .from(receiptItems)
    .where(eq(receiptItems.receiptId, id))
    .all();
  return { ...receipt, items };
}

export function createReceiptFromFile(input: {
  filename: string;
  mime: string;
  buffer: Buffer;
  person?: string | null;
  accountId?: number | null;
  store?: string | null;
  notes?: string | null;
}) {
  const safeName = `${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const absPath = path.join(paths.receiptsDir, safeName);
  fs.writeFileSync(absPath, input.buffer);

  return db
    .insert(receipts)
    .values({
      filename: input.filename,
      mime: input.mime,
      path: path.join("data", "receipts", safeName),
      status: "pending",
      person: input.person ?? null,
      accountId: input.accountId ?? getDefaultAccountId(),
      store: input.store ?? null,
      notes: input.notes ?? null,
    })
    .returning()
    .get();
}

export function analyzeReceipt(
  id: number,
  payload: {
    store?: string | null;
    person?: string | null;
    accountId?: number | null;
    items: Array<{
      description: string;
      amount: number;
      category?: string | null;
      subcategory?: string | null;
      accepted?: boolean;
    }>;
  },
) {
  const receipt = db.select().from(receipts).where(eq(receipts.id, id)).get();
  if (!receipt) throw new Error("Reçu introuvable");

  db.delete(receiptItems).where(eq(receiptItems.receiptId, id)).run();

  for (const item of payload.items) {
    db.insert(receiptItems)
      .values({
        receiptId: id,
        description: item.description,
        amount: item.amount,
        category: item.category ?? null,
        subcategory: item.subcategory ?? null,
        accepted: item.accepted === false ? 0 : 1,
      })
      .run();
  }

  return db
    .update(receipts)
    .set({
      status: "analyzed",
      store: payload.store ?? receipt.store,
      person: payload.person ?? receipt.person,
      accountId: payload.accountId ?? receipt.accountId,
      analyzedAt: new Date().toISOString(),
    })
    .where(eq(receipts.id, id))
    .returning()
    .get();
}

export async function confirmReceipt(id: number) {
  const receipt = getReceipt(id);
  if (!receipt) throw new Error("Reçu introuvable");
  if (receipt.status === "confirmed") {
    return { created: [], receipt };
  }

  const accepted = receipt.items.filter((i) => i.accepted === 1);
  const date = new Date().toISOString().slice(0, 10);

  const created = await createExpenses(
    accepted.map((item) => ({
      date,
      amount: item.amount,
      description: item.description,
      store: receipt.store,
      person: receipt.person,
      category: item.category || "Divers",
      subcategory: item.subcategory,
      accountId: receipt.accountId,
      receiptId: receipt.id,
      source: "receipt" as const,
      type: "expense" as const,
    })),
  );

  const updated = db
    .update(receipts)
    .set({
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
    })
    .where(eq(receipts.id, id))
    .returning()
    .get();

  return { created, receipt: updated };
}

export function updateReceiptItem(
  itemId: number,
  patch: Partial<{
    description: string;
    amount: number;
    category: string | null;
    subcategory: string | null;
    accepted: boolean;
  }>,
) {
  const values: Record<string, unknown> = {};
  if (patch.description !== undefined) values.description = patch.description;
  if (patch.amount !== undefined) values.amount = patch.amount;
  if (patch.category !== undefined) values.category = patch.category;
  if (patch.subcategory !== undefined) values.subcategory = patch.subcategory;
  if (patch.accepted !== undefined) values.accepted = patch.accepted ? 1 : 0;

  return db
    .update(receiptItems)
    .set(values)
    .where(eq(receiptItems.id, itemId))
    .returning()
    .get();
}
