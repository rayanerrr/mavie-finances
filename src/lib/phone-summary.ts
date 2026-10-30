import fs from "fs";
import path from "path";
import os from "os";
import { db } from "@/db";
import { budgets, categories, expenses, receipts } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { getSetting } from "./settings";
import { currentMonthKey, monthLabel, previousMonthKey } from "./money";
import { upcoming } from "./recurring";

function rounded(value:number) { return Math.round(value * 100) / 100; }

export function phoneSummary() {
  const month=currentMonthKey(), previous=previousMonthKey(month);
  const rows=db.select({date:expenses.date,description:expenses.description,store:expenses.store,amount:expenses.amount,type:expenses.type,source:expenses.source,category:categories.name,color:categories.color,id:expenses.id}).from(expenses).innerJoin(categories,eq(expenses.categoryId,categories.id)).where(eq(expenses.monthKey,month)).orderBy(desc(expenses.date),desc(expenses.id)).all();
  const spent=rounded(rows.filter(row=>row.type==="expense").reduce((sum,row)=>sum+row.amount,0));
  const income=rounded(rows.filter(row=>row.type==="income").reduce((sum,row)=>sum+row.amount,0));
  const categoryRows=db.select({name:categories.name,color:categories.color,total:sql<number>`coalesce(sum(${expenses.amount}), 0)`}).from(expenses).innerJoin(categories,eq(expenses.categoryId,categories.id)).where(and(eq(expenses.monthKey,month),eq(expenses.type,"expense"))).groupBy(categories.id,categories.name,categories.color).orderBy(desc(sql`sum(${expenses.amount})`)).all();
  const top=categoryRows.filter(row=>row.name!=="Autres").slice(0,8), excluded=categoryRows.filter(row=>row.name==="Autres" || !top.some(item=>item.name===row.name));
  const byCategory=top.map(row=>({name:row.name,color:row.color,total:rounded(Number(row.total)),pct:spent ? rounded(Number(row.total)/spent*100) : 0}));
  const otherTotal=excluded.reduce((sum,row)=>sum+Number(row.total),0);
  if (otherTotal > 0) byCategory.push({name:"Autres",color:categoryRows.find(row=>row.name==="Autres")?.color ?? "#6b6a65",total:rounded(otherTotal),pct:spent ? rounded(otherTotal/spent*100) : 0});
  const budget=db.select({total:sql<number | null>`sum(${budgets.amount})`}).from(budgets).where(eq(budgets.monthKey,month)).get();
  const fixed=upcoming(month).items.map(item=>({name:item.name,amount:item.amount,date:item.date,status:item.status,type:item.type}));
  const recent=db.select({date:expenses.date,description:expenses.description,store:expenses.store,amount:expenses.amount,type:expenses.type,category:categories.name,color:categories.color,source:expenses.source,id:expenses.id}).from(expenses).innerJoin(categories,eq(expenses.categoryId,categories.id)).orderBy(desc(expenses.date),desc(expenses.id)).limit(20).all().map(({id,...row})=>row);
  const previousSpent=db.select({total:sql<number>`coalesce(sum(${expenses.amount}), 0)`}).from(expenses).where(and(eq(expenses.monthKey,previous),eq(expenses.type,"expense"))).get();
  const pendingReceipts=db.select({count:sql<number>`count(*)`}).from(receipts).where(sql`${receipts.status} IN ('pending','analyzing','analyzed','error')`).get();
  return {updatedAt:new Date().toISOString(),householdName:getSetting("householdName"),month,monthLabel:monthLabel(month),spent,income,remaining:income ? rounded(income-spent) : null,budgetTotal:budget?.total == null ? null : rounded(Number(budget.total)),byCategory,upcomingFixed:fixed,recent,pendingReceipts:Number(pendingReceipts?.count ?? 0),previousMonthSpent:rounded(Number(previousSpent?.total ?? 0))};
}

export function writePhoneSummary() {
  try {
    // Même dossier iCloud que config.json : c'est là que l'iPhone le lit.
    const dir=process.env.MAVIE_INBOX_DIR || getSetting("inboxDir") || path.join(os.homedir(),"Library/Mobile Documents/com~apple~CloudDocs/MaVie");
    if (getSetting("inboxEnabled")==="false") return;
    fs.mkdirSync(dir,{recursive:true});
    const destination=path.join(dir,"resume.json"), temporary=`${destination}.${process.pid}.tmp`;
    fs.writeFileSync(temporary,JSON.stringify(phoneSummary(),null,2));
    fs.renameSync(temporary,destination);
  } catch { /* Le résumé est auxiliaire et ne doit jamais faire échouer le moteur. */ }
}

export function schedulePhoneSummary() {
  setImmediate(writePhoneSummary);
}
