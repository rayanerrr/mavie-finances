import { listRecurring, saveRecurring } from "@/lib/recurring";
import { apiError } from "@/lib/api";
import { schedulePhoneSummary } from "@/lib/phone-summary";
export const runtime="nodejs";
export async function GET() { return Response.json({items:listRecurring()}); }
export async function POST(request:Request) {
  try { const item=await saveRecurring(await request.json()); schedulePhoneSummary(); return Response.json({item},{status:201}); } catch(error) { return apiError(error); }
}
