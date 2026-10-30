import { listRecurring, saveRecurring } from "@/lib/recurring";
import { apiError } from "@/lib/api";
export const runtime="nodejs";
export async function GET() { return Response.json({items:listRecurring()}); }
export async function POST(request:Request) {
  try { return Response.json({item:await saveRecurring(await request.json())},{status:201}); } catch(error) { return apiError(error); }
}
