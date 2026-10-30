import { randomUUID } from "crypto";
import { readReceipt } from "./gemini";
import { learnRule } from "./category-rules";
import { todayDate } from "./recurring";
import { desc, eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { db, paths } from "@/db";
import { categories, subcategories, expenses, receiptItems, receipts } from "@/db/schema";
import { getDefaultAccountId } from "@/lib/accounts";
import { normalizeQuantity } from "@/lib/units";

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
  const itemsSum = Math.round(items.filter(i=>i.accepted===1).reduce((sum,i)=>sum+i.amount,0)*100)/100;
  return { ...receipt, items, itemsSum, difference:receipt.total == null ? null : Math.round((receipt.total-itemsSum)*100)/100 };
}

export function createReceiptFromFile(input: {
  origin?: "upload" | "icloud";
  inboxKey?: string;
  filename: string;
  mime: string;
  buffer: Buffer;
  person?: string | null;
  accountId?: number | null;
  store?: string | null;
  notes?: string | null;
}) {
  const safeName = `${randomUUID()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const absPath = path.join(paths.receiptsDir, safeName);
  fs.writeFileSync(absPath, input.buffer);

  return db
    .insert(receipts)
    .values({
      filename: input.filename,
      mime: input.mime,
      path: absPath,
      origin: input.origin ?? "upload",
      inboxKey: input.inboxKey,
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
    purchaseDate?: string | null;
    purchaseTime?: string | null;
    total?: number | null;
    subtotal?: number | null;
    taxes?: number | null;
    model?: string;
    raw?: string;
    store?: string | null;
    person?: string | null;
    accountId?: number | null;
    items: Array<{
      quantity?: number | null;
      rawText?: string | null;
      confidence?: number | null;
      unit?: string | null;
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

  if (receipt.status === "confirmed") throw new Error("Ce reçu est déjà confirmé");
  return db.transaction(() => {
  db.delete(receiptItems).where(eq(receiptItems.receiptId, id)).run();

  for (const item of payload.items) {
    db.insert(receiptItems)
      .values({
        receiptId: id,
      quantity: item.quantity, rawText: item.rawText, confidence: item.confidence,
        unit: item.unit ?? null,
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
      status: "analyzed", error: null,
      purchaseDate: payload.purchaseDate, purchaseTime: payload.purchaseTime ?? null, total: payload.total, subtotal: payload.subtotal, taxes: payload.taxes, model: payload.model, aiRaw: payload.raw,
      store: payload.store ?? receipt.store,
      person: payload.person ?? receipt.person,
      accountId: payload.accountId ?? receipt.accountId,
      analyzedAt: new Date().toISOString(),
    })
    .where(eq(receipts.id, id))
    .returning()
    .get();
  });
}

export async function confirmReceipt(id: number) {
  const receipt = getReceipt(id);
  if (!receipt) throw new Error("Reçu introuvable");
  if (receipt.status === "confirmed") {
    return { created: [], receipt };
  }

  if (receipt.status !== "analyzed") throw new Error("Le reçu doit être analysé avant confirmation");
  return db.transaction(() => {
    const current = getReceipt(id)!;
    if (current.status === "confirmed") return {created:[],receipt:current};
    const created = current.items.filter(i=>i.accepted === 1).map(item => {
      const category = db.select().from(categories).where(eq(categories.name,item.category || "Autres")).get();
      if (!category) throw new Error("Catégorie inconnue");
      const sub = db.select().from(subcategories).all().find(s=>s.categoryId===category.id && s.name===item.subcategory);
      const date = current.purchaseDate || todayDate();
      const measure = normalizeQuantity(item.quantity, item.unit);
      const row = db.insert(expenses).values({date, time: current.purchaseTime, quantity: measure.quantity, unit: measure.unit, monthKey:date.slice(0,7),amount:item.amount,description:item.description,store:current.store,person:current.person,categoryId:category.id,subcategoryId:sub?.id ?? null,accountId:current.accountId,receiptId:id,source:"receipt",type:"expense"}).returning().get();
      learnRule(item.description,current.store,category.name,sub?.name ?? null);
      if (item.rawText && item.rawText !== item.description) learnRule(item.rawText,current.store,category.name,sub?.name ?? null);
      return row;
    });
    const updated=db.update(receipts).set({status:"confirmed",confirmedAt:new Date().toISOString()}).where(eq(receipts.id,id)).returning().get();
    return {created,receipt:updated};
  });
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

export function receiptFilePath(receipt: {path:string}) {
  return path.isAbsolute(receipt.path) ? receipt.path : path.join(paths.receiptsDir,path.basename(receipt.path));
}
export function markAnalyzing(id:number) {
  const receipt=getReceipt(id);
  if (!receipt) throw new Error("Reçu introuvable");
  if (["confirmed","analyzing"].includes(receipt.status)) throw new Error("Ce reçu est déjà confirmé ou en cours d'analyse");
  return db.update(receipts).set({status:"analyzing",error:null}).where(eq(receipts.id,id)).returning().get();
}
const analysisGlobal=globalThis as typeof globalThis & {mavieAnalyses?:Set<number>};
const analyses=analysisGlobal.mavieAnalyses ??= new Set<number>();
export async function runReceiptAnalysis(id:number) {
  if (analyses.has(id)) return;
  analyses.add(id);
  try {
    const receipt=getReceipt(id);
    if (!receipt || receipt.status === "confirmed") return;
    if (receipt.status !== "analyzing") markAnalyzing(id);
    const result=await readReceipt(fs.readFileSync(receiptFilePath(receipt)),receipt.mime);
    if (getReceipt(id)) analyzeReceipt(id,result);
  } catch (error) {
    db.update(receipts).set({status:"error",error:error instanceof Error ? error.message : "Erreur de lecture du reçu"}).where(eq(receipts.id,id)).run();
  } finally { analyses.delete(id); }
}
export function deleteReceipt(id:number) {
  const receipt=getReceipt(id);
  if (!receipt) throw new Error("Reçu introuvable");
  db.transaction(() => {
    db.delete(receiptItems).where(eq(receiptItems.receiptId,id)).run();
    db.delete(receipts).where(eq(receipts.id,id)).run();
  });
  const file=receiptFilePath(receipt);
  if (file.startsWith(paths.receiptsDir+path.sep)) fs.rmSync(file,{force:true});
}
