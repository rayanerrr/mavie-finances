import { getReceipt, deleteReceipt } from "@/lib/receipts";
import { db } from "@/db";
import { receipts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiError, routeId, pickFields, type IdContext } from "@/lib/api";
import { validDate } from "@/lib/recurring";
export const runtime="nodejs";
export async function GET(_request:Request, ctx:IdContext) {
  try {
    const receipt=getReceipt(await routeId(ctx));
    if (!receipt) throw new Error("Reçu introuvable");
    return Response.json({...receipt,receipt});
  } catch(error) { return apiError(error); }
}
export async function PATCH(request:Request, ctx:IdContext) {
  try {
    const id=await routeId(ctx);
    if (!getReceipt(id)) throw new Error("Reçu introuvable");
    const body=await request.json(), patch=pickFields(body,["store","person","accountId","purchaseDate","total","notes"]);
    if (body.purchaseDate != null && !validDate(body.purchaseDate)) throw new Error("Date invalide");
    if (body.total != null && (typeof body.total!=="number" || !Number.isFinite(body.total))) throw new Error("Montant invalide");
    if (Object.keys(patch).length) db.update(receipts).set(patch).where(eq(receipts.id,id)).run();
    return Response.json({receipt:getReceipt(id)});
  } catch(error) { return apiError(error); }
}
export async function DELETE(_request:Request, ctx:IdContext) {
  try { deleteReceipt(await routeId(ctx)); return Response.json({ok:true}); } catch(error) { return apiError(error); }
}
