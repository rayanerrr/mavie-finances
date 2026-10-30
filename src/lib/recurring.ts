import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, expenses, recurring, subcategories } from "@/db/schema";
import { getOrCreateCategory, getOrCreateSubcategory } from "./categories";

export type Recurring = typeof recurring.$inferSelect;
export function todayDate() { return new Date().toLocaleDateString("en-CA"); }
export function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function monthlyEquivalent(amount: number, frequency: string) {
  return amount * ({weekly:52/12, biweekly:26/12, yearly:1/12, monthly:1}[frequency] ?? 1);
}
function occurrence(item: Recurring, index: number) {
  const [y,m,d] = item.startDate.split("-").map(Number);
  if (item.frequency === "weekly" || item.frequency === "biweekly") return new Date(Date.UTC(y,m-1,d+index*(item.frequency === "weekly" ? 7 : 14))).toISOString().slice(0,10);
  const month = m-1+index*(item.frequency === "yearly" ? 12 : 1);
  const last = new Date(Date.UTC(y,month+1,0)).getUTCDate();
  return new Date(Date.UTC(y,month,Math.min(item.dayOfMonth ?? d,last))).toISOString().slice(0,10);
}
export function nextDate(item: Recurring, from = todayDate()): string | null {
  if (!item.active) return null;
  for (let i=0; i<120000; i++) {
    const date = occurrence(item,i);
    if (item.endDate && date > item.endDate) return null;
    if (date >= from && date >= item.startDate) return date;
  }
  return null;
}
function datesThrough(item: Recurring, until: string) {
  const dates: string[] = [];
  if (!item.active) return dates;
  for (let i=0; i<120000; i++) {
    const date = occurrence(item,i);
    if (date > until || (item.endDate && date > item.endDate)) break;
    if (date >= item.startDate) dates.push(date);
  }
  return dates;
}
export function materializeRecurring(today = todayDate()) {
  if (!validDate(today)) throw new Error("Date invalide");
  return db.transaction(tx => {
    let created = 0;
    for (const item of tx.select().from(recurring).all()) for (const date of datesThrough(item,today)) {
      created += tx.insert(expenses).values({date,monthKey:date.slice(0,7),amount:item.amount,description:item.name,type:item.type,categoryId:item.categoryId,subcategoryId:item.subcategoryId,accountId:item.accountId,person:item.person,store:item.store,notes:item.notes,source:"recurring",recurringId:item.id}).onConflictDoNothing().run().changes;
    }
    return created;
  });
}
export function listRecurring() {
  return db.select().from(recurring).all().map(item => ({...item,active:!!item.active,
    categoryName:db.select().from(categories).where(eq(categories.id,item.categoryId)).get()?.name,
    categoryColor:db.select().from(categories).where(eq(categories.id,item.categoryId)).get()?.color,
    subcategoryName:item.subcategoryId ? db.select().from(subcategories).where(eq(subcategories.id,item.subcategoryId)).get()?.name : null,
    accountName:item.accountId ? db.select().from(accounts).where(eq(accounts.id,item.accountId)).get()?.name : null,
    nextDate:nextDate(item), monthlyEquivalent:monthlyEquivalent(item.amount,item.frequency),
  }));
}
export type RecurringInput = {name:string; amount:number; type:string; category:string; subcategory?:string|null; accountId?:number|null; person?:string|null; store?:string|null; frequency:string; dayOfMonth?:number|null; startDate:string; endDate?:string|null; notes?:string|null; active?:boolean};
export async function saveRecurring(input: Partial<RecurringInput>, id?: number) {
  const old = id ? listRecurring().find(i=>i.id===id) : undefined;
  if (id && !old) throw new Error("Dépense fixe introuvable");
  const value = {...old,category:old?.categoryName,subcategory:old?.subcategoryName,...input};
  if (!value.name?.trim() || typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount < 0 || !value.category?.trim()) throw new Error("Nom, montant positif et catégorie requis");
  if (!["expense","income"].includes(value.type!) || !["monthly","weekly","biweekly","yearly"].includes(value.frequency!)) throw new Error("Type ou fréquence invalide");
  if (!validDate(value.startDate) || (value.endDate && (!validDate(value.endDate) || value.endDate < value.startDate))) throw new Error("Dates invalides");
  if (value.dayOfMonth != null && (!Number.isInteger(value.dayOfMonth) || value.dayOfMonth<1 || value.dayOfMonth>31)) throw new Error("Jour du mois invalide");
  if (value.active !== undefined && typeof value.active !== "boolean") throw new Error("active doit être un booléen");
  const cat = await getOrCreateCategory(value.category,{kind:value.type === "income" ? "income" : undefined});
  const sub = value.subcategory ? await getOrCreateSubcategory(cat.id,value.subcategory) : null;
  const data = {name:value.name.trim(),amount:value.amount,type:value.type!,frequency:value.frequency!,startDate:value.startDate,endDate:value.endDate ?? null,dayOfMonth:value.dayOfMonth ?? null,categoryId:cat.id,subcategoryId:sub?.id ?? null,accountId:value.accountId ?? null,person:value.person ?? null,store:value.store ?? null,notes:value.notes ?? null,active:value.active === false ? 0 : 1};
  const row = id ? db.update(recurring).set(data).where(eq(recurring.id,id)).returning().get() : db.insert(recurring).values(data).returning().get();
  materializeRecurring();
  return listRecurring().find(i=>i.id===row.id)!;
}
export function deleteRecurring(id: number) {
  if (!db.delete(recurring).where(eq(recurring.id,id)).run().changes) throw new Error("Dépense fixe introuvable");
}
export function upcoming(monthKey: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) throw new Error("Mois invalide");
  const paid = db.select().from(expenses).all();
  const cats = db.select().from(categories).all();
  const items = db.select().from(recurring).all().flatMap(item => datesThrough(item,monthKey+"-31").filter(d=>d.startsWith(monthKey)).map(date => ({recurringId:item.id,name:item.name,amount:item.amount,type:item.type,date,categoryName:cats.find(c=>c.id===item.categoryId)?.name,categoryColor:cats.find(c=>c.id===item.categoryId)?.color,status:paid.some(e=>e.recurringId===item.id && e.date===date) ? "paid" as const : "upcoming" as const}))).sort((a,b)=>a.date.localeCompare(b.date));
  return {items,totals:{expense:items.filter(i=>i.type==="expense").reduce((s,i)=>s+i.amount,0),income:items.filter(i=>i.type==="income").reduce((s,i)=>s+i.amount,0)}};
}
