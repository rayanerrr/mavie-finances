import { getGeminiKey, getSetting } from "./settings";
import { listCategoriesWithSubs } from "./categories";
import { applyRules } from "./category-rules";
import { validDate } from "./recurring";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const cache = new Map<string, {model:string; at:number}>();
export type GeminiItem = {description:string; rawText:string|null; quantity:number|null; unit:string|null; amount:number; category:string; subcategory:string|null; confidence:number|null};
export type GeminiReceipt = {store:string|null; purchaseDate:string|null; purchaseTime:string|null; subtotal:number|null; taxes:number|null; total:number|null; items:GeminiItem[]};
export const supportedMimes = ["image/jpeg","image/png","image/webp","image/heic","image/heif","application/pdf"];
async function request(endpoint:string, key:string, body?:unknown) {
  if (!key) throw new Error("Ajoute ta clé Gemini dans les paramètres pour lire les reçus.");
  for (let attempt=0; attempt<3; attempt++) {
    let response: Response;
    try {
      response = await fetch(`${BASE}/${endpoint}`,{method:body ? "POST" : "GET",headers:{"x-goog-api-key":key,"Content-Type":"application/json"},body:body ? JSON.stringify(body) : undefined,signal:AbortSignal.timeout(180000)});
    } catch (error) {
      if (error instanceof Error && ["TimeoutError","AbortError"].includes(error.name)) throw new Error("Gemini met trop de temps à répondre (service gratuit chargé). Clique sur « Relancer » dans quelques minutes.");
      throw new Error("Impossible de joindre Gemini. Vérifie ta connexion Internet.");
    }
    if (response.ok) return response.json();
    if ([429,500,503].includes(response.status) && attempt<2) { await new Promise(r=>setTimeout(r,1000*2**attempt)); continue; }
    if ([400,401,403].includes(response.status)) throw new Error("Clé Gemini invalide, accès refusé ou requête non prise en charge. Vérifie la clé et le modèle dans les paramètres.");
    if (response.status===429) throw new Error("Quota gratuit de Gemini atteint pour le moment. Le reçu est gardé : clique sur « Relancer » plus tard (le quota se renouvelle chaque jour).");
    if (response.status===404) throw new Error("Modèle Gemini introuvable. Choisis le mode automatique dans les paramètres.");
    throw new Error("Gemini est temporairement indisponible. Réessaie plus tard.");
  }
  throw new Error("Gemini est indisponible.");
}
export async function selectModel(key = getGeminiKey()) {
  const configured = getSetting("geminiModel").trim();
  if (configured) return configured.replace(/^models\//,"");
  const cached = cache.get(key);
  if (cached && Date.now()-cached.at<3600000) return cached.model;
  type Model = {name:string; supportedGenerationMethods?:string[]};
  const models:Model[] = [];
  let pageToken = "";
  do {
    const page = await request(`models?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,key);
    models.push(...(page.models ?? [])); pageToken = page.nextPageToken ?? "";
  } while(pageToken);
  const eligible = models.filter(m=>m.name.includes("flash") && !/lite|tts|image|live|embedding|audio|native/i.test(m.name) && m.supportedGenerationMethods?.includes("generateContent"));
  eligible.sort((a,b)=> {
    const version = (name:string) => Number(name.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
    return version(b.name)-version(a.name) || b.name.localeCompare(a.name,undefined,{numeric:true});
  });
  if (!eligible.length) throw new Error("Aucun modèle Gemini Flash compatible disponible pour cette clé.");
  const model = eligible[0].name.replace(/^models\//,"");
  cache.set(key,{model,at:Date.now()}); return model;
}
const str = {type:"STRING",nullable:true};
const num = {type:"NUMBER",nullable:true};
export const responseSchema = {type:"OBJECT",required:["store","purchaseDate","purchaseTime","subtotal","taxes","total","items"],properties:{store:str,purchaseDate:str,purchaseTime:str,subtotal:num,taxes:num,total:num,items:{type:"ARRAY",items:{type:"OBJECT",required:["description","rawText","quantity","unit","amount","category","subcategory","confidence"],properties:{description:{type:"STRING"},rawText:str,quantity:num,unit:{type:"STRING",enum:["kg","g","lb","L","ml","unité"]},amount:{type:"NUMBER"},category:{type:"STRING"},subcategory:str,confidence:num}}}}};
export async function readReceipt(buffer:Buffer,mime:string) {
  if (!supportedMimes.includes(mime)) throw new Error("Format non pris en charge. Utilise JPEG, PNG, WEBP, HEIC, HEIF ou PDF.");
  const key=getGeminiKey(), model=await selectModel(key);
  const categories=listCategoriesWithSubs();
  const prompt = `Lis ce reçu québécois et réponds en français, montants en CAD. Trouve le magasin, la date d'achat YYYY-MM-DD et l'heure d'achat HH:MM, le sous-total, les taxes TPS+TVQ et le total payé. Pour chaque article, renvoie quantity et unit, avec unit exclusivement parmi kg, g, lb, L, ml, unité; utilise unité si aucune mesure n'est lisible. Développe les abréviations (PC POIT POUL DS = Poitrine de poulet désossée), garde le texte exact dans rawText. Chaque article doit avoir son montant NET après ses rabais, pour toute la quantité (ne multiplie pas une deuxième fois). Ne compte ni taxes, ni sous-total, ni total, ni paiement comme articles. Si le reçu est une facture sans liste d'articles identifiable (par exemple essence, stationnement ou restaurant), renvoie exactement un seul article correspondant à la dépense, avec le total payé comme montant et la catégorie/sous-catégorie appropriée (par exemple Transport › Essence pour l'essence). Rapporte les taxes séparément. N'invente aucune donnée illisible : utilise null. Choisis exclusivement les catégories et sous-catégories suivantes, avec leur orthographe exacte : ${JSON.stringify(categories.map(c=>({category:c.name,subcategories:c.subcategories.map(s=>s.name)})))}.`;
  const result=await request(`models/${encodeURIComponent(model)}:generateContent`,key,{contents:[{parts:[{text:prompt},{inline_data:{mime_type:mime,data:buffer.toString("base64")}}]}],generationConfig:{responseMimeType:"application/json",responseSchema,temperature:0.1}});
  const text = result.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text ?? "").join("");
  let parsed:GeminiReceipt;
  try { parsed=JSON.parse(text); } catch { throw new Error("Gemini n'a pas pu lire ce reçu. Essaie une photo plus nette."); }
  if (!Array.isArray(parsed.items) || !parsed.items.length) throw new Error("Aucun article lisible sur ce reçu.");
  for (const item of parsed.items) {
    if (typeof item.description!=="string" || !Number.isFinite(item.amount)) throw new Error("Gemini a renvoyé un article invalide. Réessaie.");
    const cat = categories.find(c=>c.name===item.category) ?? categories.find(c=>c.name==="Autres")!;
    item.category=cat.name;
    if (!cat.subcategories.some(s=>s.name===item.subcategory)) item.subcategory=null;
  }
  parsed.purchaseDate=validDate(parsed.purchaseDate) ? parsed.purchaseDate : null;
  parsed.purchaseTime=typeof parsed.purchaseTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(parsed.purchaseTime) ? parsed.purchaseTime : null;
  parsed.store=typeof parsed.store === "string" ? parsed.store : null;
  for (const field of ["total","subtotal","taxes"] as const) if (typeof parsed[field]!=="number" || !Number.isFinite(parsed[field])) parsed[field]=null;
  for (const item of parsed.items) if (!["kg","g","lb","L","ml","unité"].includes(item.unit ?? "")) item.unit="unité";
  const raw=JSON.stringify(parsed);
  if (parsed.taxes && parsed.taxes>0) {
    const largest=parsed.items.reduce((a,b)=>a.amount>b.amount?a:b);
    parsed.items.push({description:"Taxes (TPS/TVQ)",rawText:"TPS/TVQ",quantity:1,unit:"unité",amount:parsed.taxes,category:largest.category,subcategory:largest.subcategory,confidence:1});
  }
  parsed.items=applyRules(parsed.items,parsed.store);
  return {...parsed,model,raw};
}
export async function testGemini(key = getGeminiKey()) {
  const model=await selectModel(key);
  await request(`models/${encodeURIComponent(model)}:generateContent`,key,{contents:[{parts:[{text:"Réponds seulement OK."}]}],generationConfig:{maxOutputTokens:32}});
  return model;
}
