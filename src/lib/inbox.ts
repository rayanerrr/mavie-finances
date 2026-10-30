import fs from "fs";
import path from "path";
import os from "os";
import { createHash } from "crypto";
import { execFile } from "child_process";
import { db } from "@/db";
import { accounts, receiptItems, receipts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSetting } from "./settings";
import { createReceiptFromFile, getReceipt, markAnalyzing, runReceiptAnalysis } from "./receipts";
import { materializeRecurring } from "./recurring";
import { createExpenses } from "./expenses";
import { listCategoriesWithSubs } from "./categories";
import { validDate } from "./recurring";
import { writePhoneSummary } from "./phone-summary";

type State = {started:boolean; scanning:boolean; lastScanAt:string|null; lastError:string|null; waitingFiles:number; watcher?:fs.FSWatcher; watchedDir?:string; stable:Map<string,{size:number;mtime:number;count:number}>; downloads:Set<string>};
const globalInbox=globalThis as typeof globalThis & {mavieInbox?:State};
const state:State=globalInbox.mavieInbox ??= {started:false,scanning:false,lastScanAt:null,lastError:null,waitingFiles:0,stable:new Map(),downloads:new Set()};
export function inboxDir() { return process.env.MAVIE_INBOX_DIR || getSetting("inboxDir") || path.join(os.homedir(),"Library/Mobile Documents/com~apple~CloudDocs/MaVie"); }
function enabled() { return getSetting("inboxEnabled")!=="false"; }
const mimes:Record<string,string>={".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp",".heic":"image/heic",".heif":"image/heif",".pdf":"application/pdf"};
export function writeInboxConfig() {
  if (!enabled()) return;
  try {
    const dir=inboxDir();
    fs.mkdirSync(path.join(dir,"A-traiter"),{recursive:true});
    fs.mkdirSync(path.join(dir,"Traites"),{recursive:true});
    const config={householdName:getSetting("householdName"),people:JSON.parse(getSetting("people") || "[]"),accounts:db.select({id:accounts.id,name:accounts.name}).from(accounts).all(),categories:listCategoriesWithSubs().map(category=>({name:category.name,kind:category.kind,color:category.color,subcategories:category.subcategories.map(subcategory=>subcategory.name)})),updatedAt:new Date().toISOString()};
    fs.writeFileSync(path.join(dir,"config.json.tmp"),JSON.stringify(config,null,2));
    fs.renameSync(path.join(dir,"config.json.tmp"),path.join(dir,"config.json"));
  } catch { state.lastError="Impossible d'écrire la configuration du dossier iCloud."; }
}
export function inboxStatus() {
  const recent=db.select().from(receipts).where(eq(receipts.origin,"icloud")).orderBy(desc(receipts.id)).limit(20).all().map(r=>({receiptId:r.id,store:r.store,total:r.total,itemsCount:db.select().from(receiptItems).where(eq(receiptItems.receiptId,r.id)).all().length,status:r.status,at:r.analyzedAt || r.createdAt}));
  return {enabled:enabled(),dir:inboxDir(),exists:fs.existsSync(inboxDir()),lastScanAt:state.lastScanAt,waitingFiles:state.waitingFiles,lastError:state.lastError,recent};
}
function companionFor(file:string) {
  return [file+".json",file.slice(0,-path.extname(file).length)+".json"].find(p=>fs.existsSync(p));
}
type PhoneExpense = {kind:"expense";type:"expense"|"income";amount:number;description:string;category:string;subcategory:string|null;person:string|null;accountName:string|null;date:string;note:string|null;createdAt:string};
function isPhoneExpense(value:unknown): value is PhoneExpense {
  if (!value || typeof value !== "object") return false;
  const item=value as Partial<PhoneExpense>;
  return item.kind === "expense" && (item.type === "expense" || item.type === "income") && typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount >= 0 && typeof item.description === "string" && !!item.description.trim() && typeof item.category === "string" && !!item.category.trim() && typeof item.date === "string" && validDate(item.date) && typeof item.createdAt === "string" && !Number.isNaN(Date.parse(item.createdAt));
}
async function importPhoneExpense(file:string,dir:string) {
  const name=path.basename(file), destination=path.join(dir,"Traites",name), resultFile=destination+".result.json";
  if (fs.existsSync(destination) || fs.existsSync(resultFile)) return false;
  let payload:unknown;
  try { payload=JSON.parse(fs.readFileSync(file,"utf8")); } catch { throw new Error("Le fichier de dépense du téléphone est invalide."); }
  if (!isPhoneExpense(payload)) throw new Error("Le fichier de dépense du téléphone est invalide.");
  const categories=listCategoriesWithSubs();
  const category=categories.find(item=>item.name===payload.category) ?? categories.find(item=>item.name==="Autres")!;
  const subcategory=payload.subcategory && category.subcategories.some(item=>item.name===payload.subcategory) ? payload.subcategory : null;
  const account=payload.accountName ? db.select().from(accounts).where(eq(accounts.name,payload.accountName)).get() : null;
  const created=(await createExpenses([{date:payload.date,amount:payload.amount,description:payload.description.trim(),category:category.name,subcategory,person:payload.person ?? null,accountId:account?.id ?? null,notes:payload.note ?? null,type:payload.type,source:"phone"}]))[0];
  fs.renameSync(file,destination);
  const result={status:"added",expenseId:created.id,description:created.description,amount:created.amount,category:created.categoryName};
  fs.writeFileSync(resultFile,JSON.stringify(result,null,2));
  writePhoneSummary();
  return true;
}
async function importFile(file:string,dir:string) {
  const buffer=fs.readFileSync(file);
  const inboxKey=createHash("sha256").update(buffer).digest("hex");
  let receipt=db.select().from(receipts).where(eq(receipts.inboxKey,inboxKey)).get();
  const companion=companionFor(file);
  if (!receipt) {
    let meta: {person?:string;accountName?:string;note?:string;capturedAt?:string}={};
    if (companion) { try { meta=JSON.parse(fs.readFileSync(companion,"utf8")); } catch { throw new Error("Le fichier compagnon JSON est invalide."); } }
    const account=meta.accountName ? db.select().from(accounts).where(eq(accounts.name,meta.accountName)).get() : null;
    receipt=createReceiptFromFile({filename:path.basename(file),mime:mimes[path.extname(file).toLowerCase()],buffer,origin:"icloud",inboxKey,person:typeof meta.person==="string" ? meta.person : null,accountId:account?.id,notes:typeof meta.note==="string" ? meta.note : null});
    markAnalyzing(receipt.id);
    await runReceiptAnalysis(receipt.id);
  } else if (["pending","analyzing"].includes(receipt.status)) await runReceiptAnalysis(receipt.id);
  const result=getReceipt(receipt.id);
  if (!result) return;
  const destination=path.join(dir,"Traites",path.basename(file));
  // Preserve an older processed file when a phone reuses a filename.
  const target=fs.existsSync(destination) ? path.join(dir,"Traites",`${receipt.id}-${path.basename(file)}`) : destination;
  fs.renameSync(file,target);
  if (companion) fs.renameSync(companion,target+".json");
  const payload={status:result.status,receiptId:result.id,store:result.store,total:result.total,itemsCount:result.items.length,error:result.error,processedAt:new Date().toISOString()};
  fs.writeFileSync(target+".result.json",JSON.stringify(payload,null,2));
  // Also support the phone's extension-free companion convention.
  fs.writeFileSync(target.slice(0,-path.extname(target).length)+".result.json",JSON.stringify(payload,null,2));
}
export async function scanInbox() {
  if (state.scanning) return;
  if (!enabled()) { state.watcher?.close(); state.watcher=undefined; state.watchedDir=undefined; state.waitingFiles=0; return; }
  state.scanning=true; state.lastScanAt=new Date().toISOString();
  try {
    const dir=inboxDir(), incoming=path.join(dir,"A-traiter");
    fs.mkdirSync(incoming,{recursive:true}); fs.mkdirSync(path.join(dir,"Traites"),{recursive:true});
    if (state.watchedDir!==incoming) {
      state.watcher?.close();
      state.watcher=fs.watch(incoming,()=>{void scanInbox();});
      state.watcher.on("error",()=>{state.watcher?.close();state.watcher=undefined;state.watchedDir=undefined;});
      state.watcher.unref(); state.watchedDir=incoming;
      writeInboxConfig();
    }
    const files=fs.readdirSync(incoming); state.waitingFiles=files.filter(n=>mimes[path.extname(n).toLowerCase()] || n.endsWith(".icloud") || n.endsWith(".expense.json")).length;
    for (const name of files) {
      const file=path.join(incoming,name);
      if (name.endsWith(".icloud")) {
        if (process.platform==="darwin" && !state.downloads.has(file)) {
          state.downloads.add(file);
          execFile("brctl",["download",file],{timeout:30000},error=>{state.downloads.delete(file);if(error)state.lastError="Téléchargement iCloud en attente.";});
        }
        continue;
      }
      const phoneExpense=name.endsWith(".expense.json");
      if (!phoneExpense && !mimes[path.extname(name).toLowerCase()]) continue;
      try {
        const stat=fs.statSync(file); if (!stat.isFile() || !stat.size) continue;
        const prev=state.stable.get(file);
        const count=prev?.size===stat.size && prev.mtime===stat.mtimeMs ? prev.count+1 : 0;
        state.stable.set(file,{size:stat.size,mtime:stat.mtimeMs,count});
        if (!phoneExpense && count<2) continue;
        if (phoneExpense) await importPhoneExpense(file,dir); else await importFile(file,dir);
        state.stable.delete(file); state.waitingFiles--; state.lastError=null;
        if (!phoneExpense) writePhoneSummary();
      } catch(error) {
        state.lastError=error instanceof Error ? error.message : "Import du reçu impossible";
        if (phoneExpense) {
          try {
            const destination=path.join(dir,"Traites",name), resultFile=destination+".result.json";
            if (!fs.existsSync(destination)) fs.renameSync(file,destination);
            fs.writeFileSync(resultFile,JSON.stringify({status:"error",error:state.lastError},null,2));
            state.stable.delete(file); state.waitingFiles--;
          } catch { /* Une prochaine analyse pourra reprendre le fichier. */ }
        }
      }
    }
  } catch { state.lastError="Le dossier iCloud est inaccessible. La surveillance réessaiera automatiquement."; }
  finally { state.scanning=false; }
}
export function startEngine() {
  if (state.started) return;
  state.started=true;
  // A previous process may have stopped during an analysis; recover those uploads.
  for (const r of db.select().from(receipts).all().filter(r=>r.origin==="upload" && ["pending","analyzing"].includes(r.status))) void runReceiptAnalysis(r.id);
  const generate=()=>{try {materializeRecurring();} catch {state.lastError="Impossible de générer les dépenses fixes.";}};
  generate(); writeInboxConfig(); void scanInbox();
  setInterval(generate,3600000).unref();
  setInterval(()=>writePhoneSummary(),300000).unref();
  setInterval(()=>{void scanInbox();},15000).unref();
}
