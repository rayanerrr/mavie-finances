import { getAllSettings, setSetting } from "@/lib/settings";
import { apiError } from "@/lib/api";
import { writeInboxConfig } from "@/lib/inbox";
export const runtime = "nodejs";
export async function GET() { return Response.json({settings:getAllSettings()}); }
export async function POST(request:Request) {
  try {
    const body=await request.json();
    if (typeof body.key!=="string" || body.value===undefined) throw new Error("key et value requis");
    setSetting(body.key,typeof body.value==="string" ? body.value : JSON.stringify(body.value));
    writeInboxConfig();
    return Response.json({ok:true,settings:getAllSettings()});
  } catch(error) { return apiError(error); }
}
