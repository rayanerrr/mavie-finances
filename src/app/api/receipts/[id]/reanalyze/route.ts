import { after } from "next/server";
import { markAnalyzing, runReceiptAnalysis } from "@/lib/receipts";
import { apiError, routeId, type IdContext } from "@/lib/api";
export const runtime="nodejs";
export async function POST(_request:Request, ctx:IdContext) {
  try {
    const id=await routeId(ctx), receipt=markAnalyzing(id);
    after(()=>runReceiptAnalysis(id));
    return Response.json({receipt},{status:202});
  } catch(error) { return apiError(error); }
}
