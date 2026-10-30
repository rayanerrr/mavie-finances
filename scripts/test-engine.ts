import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Always isolate this suite, even if the calling shell points at the user's data.
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "mavie-engine-"));
process.env.FINANCES_DATA_DIR = testDir;
process.env.MAVIE_INBOX_DIR = path.join(testDir, "inbox");

async function main() {
  const { db, paths } = await import("../src/db");
  const { categories, accounts, expenses, recurring, categoryRules } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");
  const { materializeRecurring, nextDate, monthlyEquivalent, saveRecurring, upcoming, todayDate } = await import("../src/lib/recurring");
  const { normalizeDescription } = await import("../src/lib/category-rules");
  const { getAllSettings, setSetting } = await import("../src/lib/settings");
  const { seedCore } = await import("../src/db/seed-core");
  assert.equal(paths.dataDir, testDir);
  assert.equal(db.select().from(categories).all().length, 11);
  assert.equal(db.select().from(accounts).all().length, 3);
  seedCore(db.$client);
  assert.equal(db.select().from(categories).all().length, 11);
  const now = new Date(), start = new Date(now.getFullYear(), now.getMonth()-3, 1).toLocaleDateString("en-CA");
  const item = await saveRecurring({name:"Loyer test",amount:1000,type:"expense",category:"Logement",frequency:"monthly",dayOfMonth:1,startDate:start});
  const generated = db.select().from(expenses).where(eq(expenses.recurringId,item.id)).all();
  assert.ok(generated.length>=3 && generated.length<=4);
  assert.equal(materializeRecurring(),0);
  const base = db.select().from(recurring).where(eq(recurring.id,item.id)).get()!;
  assert.equal(nextDate({...base,startDate:"2026-01-31",dayOfMonth:31},"2026-02-01"),"2026-02-28");
  assert.equal(nextDate({...base,startDate:"2024-01-31",dayOfMonth:31},"2024-02-01"),"2024-02-29");
  assert.equal(nextDate({...base,startDate:"2026-01-31",dayOfMonth:31},"2026-03-01"),"2026-03-31");
  assert.equal(nextDate({...base,startDate:"2026-01-01",frequency:"weekly"},"2026-01-02"),"2026-01-08");
  assert.equal(nextDate({...base,startDate:"2026-01-01",frequency:"biweekly"},"2026-01-02"),"2026-01-15");
  assert.equal(nextDate({...base,startDate:"2024-02-29",frequency:"yearly",dayOfMonth:29},"2025-01-01"),"2025-02-28");
  assert.equal(nextDate({...base,active:0}),null);
  assert.equal(nextDate({...base,endDate:"2020-01-01"}),null);
  assert.equal(monthlyEquivalent(12,"weekly"),52);
  assert.equal(monthlyEquivalent(12,"biweekly"),26);
  assert.equal(monthlyEquivalent(120,"yearly"),10);
  assert.equal(normalizeDescription("  ÉPICERIE -- Poulet 123,  500g! "),"epicerie poulet g");
  setSetting("geminiApiKey","secret-test-abcd");
  const safe = getAllSettings();
  assert.equal(safe.geminiConfigured,true);
  assert.equal(safe.geminiKeyHint,"…abcd");
  assert.ok(!JSON.stringify(safe).includes("secret-test"));
  assert.ok(!("geminiApiKey" in safe));
  assert.throws(()=>setSetting("unexpected","bad"));
  setSetting("geminiApiKey","");
  const { createReceiptFromFile, analyzeReceipt, confirmReceipt, getReceipt, deleteReceipt } = await import("../src/lib/receipts");
  const receipt = createReceiptFromFile({filename:"test.png",mime:"image/png",buffer:Buffer.from("test")});
  analyzeReceipt(receipt.id,{store:"Maxi",purchaseDate:"2026-09-10",total:10,items:[{description:"Poulet",amount:10,category:"Alimentation",subcategory:"Poulet"}]});
  assert.equal(getReceipt(receipt.id)?.difference,0);
  const confirmations = await Promise.all([confirmReceipt(receipt.id),confirmReceipt(receipt.id)]);
  assert.equal(confirmations.reduce((s,c)=>s+c.created.length,0),1);
  assert.equal(confirmations[0].created[0].date,"2026-09-10");
  assert.equal(db.select().from(categoryRules).all()[0].hits,1);
  deleteReceipt(receipt.id);
  assert.equal(db.select().from(expenses).where(eq(expenses.receiptId,receipt.id)).all().length,1);
  assert.ok(upcoming(todayDate().slice(0,7)).items.some(i=>i.status==="paid"));
  console.log("Tests locaux OK : seed, échéances, idempotence, février, fréquences, normalisation, réglages, confirmation et suppression.");

  // Read .env.local without printing any value or passing secrets on a command line.
  const { loadEnvConfig } = await import("@next/env");
  loadEnvConfig(process.cwd());
  if (process.env.GEMINI_API_KEY) {
    const lines=["MAXI - BROSSARD","2026-10-29","PC POIT POUL DS    12.00","LAIT 2L            4.00","POMMES             3.00","PAIN BLE           3.00","SAVON              5.00","SHAMPOOING         8.00","SOUS-TOTAL        35.00","TPS                0.65","TVQ                1.30","TOTAL CAD         36.95"];
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="650" height="800"><rect width="100%" height="100%" fill="white"/><g fill="black" font-family="monospace" font-size="25">${lines.map((line,i)=>`<text x="40" y="${70+i*55}">${line}</text>`).join("")}</g></svg>`;
    const svgFile=path.join(testDir,"recu-test.svg"); fs.writeFileSync(svgFile,svg);
    try { execFileSync("qlmanage",["-t","-s","1200","-o",testDir,svgFile],{stdio:"pipe"}); }
    catch {
      // Next already includes sharp; use it when macOS Quick Look is sandboxed.
      const {default:sharp}=await import("sharp");
      await sharp(Buffer.from(svg)).png().toFile(svgFile+".png");
    }
    const pngFile=svgFile+".png";
    assert.ok(fs.existsSync(pngFile));
    const { readReceipt } = await import("../src/lib/gemini");
    const result=await readReceipt(fs.readFileSync(pngFile),"image/png");
    assert.ok(result.store?.toLowerCase().includes("maxi"));
    assert.equal(result.items.length,7);
    assert.ok(result.items.some(i=>i.description==="Taxes (TPS/TVQ)"));
    assert.ok(Math.abs(result.items.reduce((s,i)=>s+i.amount,0)-result.total!)<0.02);
    console.log("Gemini réel OK",JSON.stringify({magasin:result.store,articles:result.items.length,categories:result.items.map(i=>`${i.category}/${i.subcategory}`),modele:result.model}));
    console.log("Image de test :",pngFile);
  } else console.log("Gemini réel non exécuté : aucune clé dans .env.local ou l'environnement.");
  console.log("Dossier temporaire :",testDir);
}
main().catch(error=>{console.error(error instanceof Error ? error.message : "Échec des tests");process.exitCode=1;});
