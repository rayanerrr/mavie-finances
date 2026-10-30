import { getReceipt, updateReceiptItem } from "@/lib/receipts";
import { db } from "@/db";
import { receiptItems } from "@/db/schema";
import { apiError, routeId, type IdContext } from "@/lib/api";
export const runtime="nodejs";
function editable(id:number) {
  const receipt=getReceipt(id);
  if (!receipt) throw new Error("Reçu introuvable");
  if (["confirmed","analyzing"].includes(receipt.status)) throw new Error("Ce reçu ne peut pas être modifié pour le moment");
  return receipt;
}
function validate(body:Record<string,unknown>) {
  if (body.amount!==undefined && (typeof body.amount!=="number" || !Number.isFinite(body.amount))) throw new Error("Montant invalide");
  if (body.description!==undefined && (typeof body.description!=="string" || !body.description.trim())) throw new Error("Description requise");
}
export async function POST(request:Request,ctx:IdContext) {
  try {
    const id=await routeId(ctx); editable(id);
    const body=await request.json(); validate(body);
    if (body.description===undefined || body.amount===undefined) throw new Error("Description et montant requis");
    const item=db.insert(receiptItems).values({receiptId:id,description:body.description,amount:body.amount,category:body.category ?? "Autres",subcategory:body.subcategory ?? null}).returning().get();
    return Response.json({item,receipt:getReceipt(id)},{status:201});
  } catch(error) { return apiError(error); }
}
export async function PATCH(request:Request,ctx:IdContext) {
  try {
    const id=await routeId(ctx), receipt=editable(id), body=await request.json(); validate(body);
    if (!receipt.items.some(i=>i.id===Number(body.itemId))) throw new Error("Article introuvable");
    updateReceiptItem(Number(body.itemId),body);
    const updated=getReceipt(id);
    return Response.json({...updated,receipt:updated});
  } catch(error) { return apiError(error); }
}
