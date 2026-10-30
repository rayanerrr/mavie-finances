import { db } from "@/db";
import { receipts } from "@/db/schema";
import { listExpenses } from "@/lib/expenses";
import { upcoming } from "@/lib/recurring";
import { apiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import {
  listMonths,
  monthTotal,
  totalsByCategory,
  totalsBySubcategory,
} from "@/lib/expenses";
import { currentMonthKey } from "@/lib/money";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const month =
    request.nextUrl.searchParams.get("month") ?? currentMonthKey();
  const categoryIdRaw = request.nextUrl.searchParams.get("categoryId");
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : undefined;

  try {
  const rows=listExpenses({month,type:"expense"});
  const byPerson=Object.entries(Object.groupBy(rows,r=>r.person || "Non précisé")).map(([person,items])=>({person,total:items!.reduce((s,i)=>s+i.amount,0),count:items!.length}));
  const byStore=Object.entries(Object.groupBy(rows,r=>r.store || "Non précisé")).map(([store,items])=>({store,total:items!.reduce((s,i)=>s+i.amount,0),count:items!.length}));
  const byAccount=Object.values(Object.groupBy(rows,r=>String(r.accountId))).map(items=>({accountId:items![0].accountId,name:items![0].accountName,color:items![0].accountColor,total:items!.reduce((s,i)=>s+i.amount,0)}));
  const fixedItems=upcoming(month).items.filter(i=>i.type==="expense");
  const fixed={total:fixedItems.reduce((s,i)=>s+i.amount,0),paid:fixedItems.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0),upcoming:fixedItems.filter(i=>i.status==="upcoming").reduce((s,i)=>s+i.amount,0)};
  return NextResponse.json({
    byPerson, byStore, byAccount, fixed,
    variable:rows.filter(r=>r.source!=="recurring").reduce((s,i)=>s+i.amount,0),
    pendingReceipts:db.select().from(receipts).all().filter(r=>["pending","analyzing","analyzed","error"].includes(r.status)).length,
    month,
    months: listMonths(),
    total: monthTotal(month),
    byCategory: totalsByCategory(month),
    bySubcategory: totalsBySubcategory(month, categoryId),
  });
  } catch(error) {return apiError(error);}
}
