import { saveRecurring, deleteRecurring } from "@/lib/recurring";
import { apiError, routeId, type IdContext } from "@/lib/api";
import { schedulePhoneSummary } from "@/lib/phone-summary";
export const runtime="nodejs";
export async function PATCH(request:Request, ctx:IdContext) {
  try { const item=await saveRecurring(await request.json(),await routeId(ctx)); schedulePhoneSummary(); return Response.json({item}); } catch(error) { return apiError(error); }
}
export async function DELETE(_request:Request, ctx:IdContext) {
  try { deleteRecurring(await routeId(ctx)); schedulePhoneSummary(); return Response.json({ok:true}); } catch(error) { return apiError(error); }
}
