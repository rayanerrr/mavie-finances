import { db } from "@/db";
import { expenses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateCategory, getOrCreateSubcategory } from "@/lib/categories";
import { apiError, routeId, pickFields, type IdContext } from "@/lib/api";
import { validDate } from "@/lib/recurring";
import { merchantKeyFromStore } from "@/lib/merchants";
import { schedulePhoneSummary } from "@/lib/phone-summary";
export const runtime="nodejs";
export async function PATCH(request:Request,ctx:IdContext) {
  try {
    const id=await routeId(ctx), old=db.select().from(expenses).where(eq(expenses.id,id)).get();
    if (!old) throw new Error("Dépense introuvable");
    const body=await request.json(), patch=pickFields(body,["date","amount","description","store","person","accountId","notes"]);
    if (body.date!==undefined) { if (!validDate(body.date)) throw new Error("Date invalide"); patch.monthKey=body.date.slice(0,7); }
    if (body.amount!==undefined && (typeof body.amount!=="number" || !Number.isFinite(body.amount))) throw new Error("Montant invalide");
    if (body.description!==undefined && (typeof body.description!=="string" || !body.description.trim())) throw new Error("Description requise");
    let categoryId=old.categoryId;
    if (body.category!==undefined) { categoryId=(await getOrCreateCategory(body.category)).id; patch.categoryId=categoryId; patch.subcategoryId=null; }
    if (body.subcategory!==undefined) patch.subcategoryId=body.subcategory ? (await getOrCreateSubcategory(categoryId,body.subcategory)).id : null;
    if (body.store!==undefined) patch.merchantKey=merchantKeyFromStore(body.store);
    const expense=Object.keys(patch).length ? db.update(expenses).set(patch).where(eq(expenses.id,id)).returning().get() : old;
    if (Object.keys(patch).length) schedulePhoneSummary();
    return Response.json({expense});
  } catch(error) { return apiError(error); }
}
export async function DELETE(_request:Request,ctx:IdContext) {
  try {
    if (!db.delete(expenses).where(eq(expenses.id,await routeId(ctx))).run().changes) throw new Error("Dépense introuvable");
    schedulePhoneSummary();
    return Response.json({ok:true});
  } catch(error) { return apiError(error); }
}
