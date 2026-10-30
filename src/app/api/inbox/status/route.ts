import { inboxStatus } from "@/lib/inbox";
export const runtime="nodejs";
export async function GET() { return Response.json(inboxStatus()); }
