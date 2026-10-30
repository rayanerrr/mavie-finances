import { testGemini } from "@/lib/gemini";
export const runtime="nodejs";
export async function POST(request:Request) {
  try {
    const text=await request.text();
    const body=text ? JSON.parse(text) : {};
    if (body.key !== undefined && typeof body.key !== "string") throw new Error("Clé invalide");
    return Response.json({ok:true,model:await testGemini(body.key)});
  } catch(error) { return Response.json({ok:false,error:error instanceof Error ? error.message : "Échec du test Gemini"},{status:400}); }
}
