import { saveRecurring, deleteRecurring } from "@/lib/recurring";
import { apiError, routeId, type IdContext } from "@/lib/api";
export const runtime="nodejs";
export async function PATCH(request:Request, ctx:IdContext) {
  try { return Response.json({item:await saveRecurring(await request.json(),await routeId(ctx))}); } catch(error) { return apiError(error); }
}
export async function DELETE(_request:Request, ctx:IdContext) {
  try { deleteRecurring(await routeId(ctx)); return Response.json({ok:true}); } catch(error) { return apiError(error); }
}
