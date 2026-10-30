import { upcoming } from "@/lib/recurring";
import { currentMonthKey } from "@/lib/money";
import { apiError } from "@/lib/api";
export const runtime="nodejs";
export async function GET(request:Request) {
  try { return Response.json(upcoming(new URL(request.url).searchParams.get("month") || currentMonthKey())); } catch(error) { return apiError(error); }
}
