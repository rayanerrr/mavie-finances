import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { categories, expenses, subcategories } from "@/db/schema";
import { iconForCategory, isIconKey } from "@/lib/classify";
import { previousMonthKey } from "@/lib/money";
import { slugify } from "@/lib/slug";

type Row = {
  id: number;
  date: string;
  time: string | null;
  amount: number;
  description: string;
  store: string | null;
  person: string | null;
  monthKey: string;
  subcategoryId: number | null;
  quantity: number | null;
  unit: string | null;
};

export type Insight = {
  tone: "bad" | "good" | "tip" | "info";
  title: string;
  body: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function pct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function lastMonths(monthKey: string, count: number) {
  const keys = [monthKey];
  while (keys.length < count) keys.unshift(previousMonthKey(keys[0]));
  return keys;
}

const visitKey = (r: Row) => `${r.date}|${r.store ?? ""}|${r.time ?? ""}`;
const sum = (rows: Row[]) => round2(rows.reduce((s, r) => s + r.amount, 0));

/** Unit with the most purchases among rows; used so a sub-category gets a single price per unit. */
function dominantUnit(rows: Row[]): string | null {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.unit && r.quantity) counts.set(r.unit, (counts.get(r.unit) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [unit, count] of counts) {
    if (count > bestCount) {
      best = unit;
      bestCount = count;
    }
  }
  return best;
}

function measure(rows: Row[], unit: string | null) {
  if (!unit) return { quantity: 0, unitPrice: null as number | null };
  const measured = rows.filter((r) => r.unit === unit && r.quantity);
  const quantity = measured.reduce((s, r) => s + (r.quantity ?? 0), 0);
  const amount = measured.reduce((s, r) => s + r.amount, 0);
  return {
    quantity: Math.round(quantity * 1000) / 1000,
    unitPrice: quantity > 0 ? round2(amount / quantity) : null,
  };
}

const PHRASES: Record<string, { label: string; plural: boolean }> = {
  viande: { label: "La viande", plural: false },
  poulet: { label: "Le poulet", plural: false },
  poisson: { label: "Le poisson", plural: false },
  charcuterie: { label: "La charcuterie", plural: false },
  legumes: { label: "Vos légumes", plural: true },
  fruits: { label: "Vos fruits", plural: true },
  "produits-laitiers": { label: "Vos produits laitiers", plural: true },
  "pains-cereales": { label: "Vos pains & céréales", plural: true },
  autres: { label: "Vos autres achats", plural: true },
  essence: { label: "L’essence", plural: false },
};

function phrase(name: string) {
  return PHRASES[slugify(name)] ?? { label: `Les dépenses « ${name} »`, plural: true };
}

function money(n: number) {
  return `${n.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

function productName(description: string) {
  const trimmed = description.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function heatmap(rows: Row[]) {
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 16 }, () => 0));
  const seen = new Set<string>();
  for (const r of rows) {
    if (!r.time) continue;
    const key = visitKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    const jsDay = new Date(`${r.date}T12:00:00`).getDay();
    const dayIndex = (jsDay + 6) % 7;
    const hour = Number(r.time.slice(0, 2));
    const col = Math.min(15, Math.max(0, hour - 6));
    grid[dayIndex][col] += 1;
  }
  return grid;
}

function productStats(rows: Row[], subNames: Map<number, string>) {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = slugify(r.description);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.values()]
    .map((list) => {
      const unit = dominantUnit(list);
      const m = measure(list, unit);
      const latest = [...list].sort((a, b) => b.date.localeCompare(a.date))[0];
      const stores = [...new Set(list.map((r) => r.store).filter(Boolean))] as string[];
      return {
        key: slugify(latest.description),
        name: productName(latest.description),
        subcategory: latest.subcategoryId ? (subNames.get(latest.subcategoryId) ?? null) : null,
        total: sum(list),
        count: list.length,
        quantity: m.quantity,
        unit,
        unitPrice: m.unitPrice,
        lastDate: latest.date,
        stores,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function subcategoryAnalytics(categoryId: number, monthKey: string) {
  const category = db.select().from(categories).where(eq(categories.id, categoryId)).get();
  if (!category) return null;

  const months = lastMonths(monthKey, 6);
  const prevKey = previousMonthKey(monthKey);
  const quarterBefore = months.slice(2, 5);
  const quarter = months.slice(3);
  const type = category.kind === "income" ? "income" : "expense";

  const subs = db.select().from(subcategories).where(eq(subcategories.categoryId, categoryId)).all();
  const subNames = new Map(subs.map((s) => [s.id, s.name]));

  const rows: Row[] = db
    .select({
      id: expenses.id,
      date: expenses.date,
      time: expenses.time,
      amount: expenses.amount,
      description: expenses.description,
      store: expenses.store,
      person: expenses.person,
      monthKey: expenses.monthKey,
      subcategoryId: expenses.subcategoryId,
      quantity: expenses.quantity,
      unit: expenses.unit,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.categoryId, categoryId),
        eq(expenses.type, type),
        inArray(expenses.monthKey, months),
      ),
    )
    .all();

  const inMonth = (key: string) => rows.filter((r) => r.monthKey === key);
  const current = inMonth(monthKey);
  const previous = inMonth(prevKey);
  const beforeQuarter = rows.filter((r) => quarterBefore.includes(r.monthKey));

  const total = sum(current);
  const prevTotal = sum(previous);
  const avg = current.length ? round2(total / current.length) : 0;
  const prevAvg = previous.length ? round2(prevTotal / previous.length) : 0;

  const merchants = (() => {
    const byStore = new Map<string, Row[]>();
    for (const r of current) {
      const store = r.store?.trim() || "Sans marchand";
      byStore.set(store, [...(byStore.get(store) ?? []), r]);
    }
    return [...byStore.entries()]
      .map(([store, list]) => ({
        store,
        total: sum(list),
        share: total > 0 ? Math.round((sum(list) / total) * 100) : 0,
        visits: new Set(list.map(visitKey)).size,
        items: list.length,
      }))
      .sort((a, b) => b.total - a.total);
  })();
  const mainMerchants = merchants.filter((m) => m.share >= 10);

  const persons = (() => {
    const byPerson = new Map<string, Row[]>();
    for (const r of current) {
      const p = r.person?.trim().toLowerCase() || "nous";
      byPerson.set(p, [...(byPerson.get(p) ?? []), r]);
    }
    return [...byPerson.entries()]
      .map(([person, list]) => ({
        person,
        total: sum(list),
        share: total > 0 ? Math.round((sum(list) / total) * 100) : 0,
        visits: new Set(list.map(visitKey)).size,
        items: list.length,
        topSub: (() => {
          const bySub = new Map<string, number>();
          for (const r of list) {
            const name = r.subcategoryId ? (subNames.get(r.subcategoryId) ?? "—") : "—";
            bySub.set(name, (bySub.get(name) ?? 0) + r.amount);
          }
          return [...bySub.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        })(),
      }))
      .sort((a, b) => b.total - a.total);
  })();

  const subStats = subs
    .map((sub) => {
      const mine = rows.filter((r) => r.subcategoryId === sub.id);
      const unit = dominantUnit(mine);
      const cur = mine.filter((r) => r.monthKey === monthKey);
      const prev = mine.filter((r) => r.monthKey === prevKey);
      const before = mine.filter((r) => quarterBefore.includes(r.monthKey));
      const m = measure(cur, unit);
      const beforeMeasure = measure(before, unit);
      const curTotal = sum(cur);
      return {
        id: sub.id,
        name: sub.name,
        total: curTotal,
        prevTotal: sum(prev),
        deltaPct: pct(curTotal, sum(prev)),
        share: total > 0 ? Math.round((curTotal / total) * 100) : 0,
        quantity: m.quantity,
        unit,
        unitPrice: m.unitPrice,
        unitPriceBefore: beforeMeasure.unitPrice,
        frequency: new Set(cur.map(visitKey)).size,
        items: cur.length,
        trend: {
          amount: months.map((k) => sum(mine.filter((r) => r.monthKey === k))),
          quantity: months.map((k) => measure(mine.filter((r) => r.monthKey === k), unit).quantity),
          frequency: months.map((k) => new Set(mine.filter((r) => r.monthKey === k).map(visitKey)).size),
          unitPrice: months.map((k) => measure(mine.filter((r) => r.monthKey === k), unit).unitPrice ?? 0),
        },
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "fr"));

  const productsMonth = productStats(current, subNames);
  const productsQuarter = productStats(
    rows.filter((r) => quarter.includes(r.monthKey)),
    subNames,
  );
  const productsHalf = productStats(rows, subNames);

  const prices = (() => {
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      if (!r.unit || !r.quantity) continue;
      const key = slugify(r.description);
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    return [...groups.values()]
      .map((list) => {
        const unit = dominantUnit(list)!;
        const now = measure(list.filter((r) => r.monthKey === monthKey), unit).unitPrice;
        const before = measure(list.filter((r) => quarterBefore.includes(r.monthKey)), unit).unitPrice;
        const history = months.map((k) => measure(list.filter((r) => r.monthKey === k), unit).unitPrice);
        const byStore = (() => {
          const stores = new Map<string, Row[]>();
          for (const r of list.filter((x) => x.unit === unit)) {
            const s = r.store?.trim() || "—";
            stores.set(s, [...(stores.get(s) ?? []), r]);
          }
          return [...stores.entries()]
            .map(([store, l]) => ({ store, unitPrice: measure(l, unit).unitPrice ?? 0, count: l.length }))
            .sort((a, b) => a.unitPrice - b.unitPrice);
        })();
        const measured = history.filter((h): h is number => h != null);
        return {
          key: slugify(list[0].description),
          name: productName(list[0].description),
          unit,
          unitPrice: now,
          averageBefore: before,
          deltaPct: now != null && before != null ? pct(now, before) : null,
          min: measured.length ? Math.min(...measured) : null,
          max: measured.length ? Math.max(...measured) : null,
          history,
          stores: byStore,
          purchases: list.length,
        };
      })
      .filter((p) => p.unitPrice != null)
      .sort((a, b) => b.purchases - a.purchases);
  })();

  const insights: Insight[] = [];
  const movers = subStats.filter((s) => s.deltaPct != null && s.total + s.prevTotal >= 15);
  const riser = [...movers].sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0))[0];
  if (riser && (riser.deltaPct ?? 0) >= 10) {
    const p = phrase(riser.name);
    insights.push({
      tone: "bad",
      title: `${p.label} ${p.plural ? "ont" : "a"} augmenté de ${riser.deltaPct} %`,
      body: `Vous avez dépensé ${money(riser.total)} ce mois-ci vs ${money(riser.prevTotal)} le mois dernier.`,
    });
  }
  const faller = [...movers].sort((a, b) => (a.deltaPct ?? 0) - (b.deltaPct ?? 0))[0];
  if (faller && (faller.deltaPct ?? 0) <= -10) {
    const p = phrase(faller.name);
    insights.push({
      tone: "good",
      title: `${p.label} ${p.plural ? "ont" : "a"} diminué de ${Math.abs(faller.deltaPct ?? 0)} %`,
      body: `Bonne tendance ! Vous avez économisé environ ${money(faller.prevTotal - faller.total)} ce mois-ci.`,
    });
  }
  const storeDeal = prices
    .filter((p) => p.stores.length >= 2 && productsMonth.some((m) => m.key === p.key))
    .map((p) => {
      const cheapest = p.stores[0];
      const usual = productsMonth.find((m) => m.key === p.key)!;
      const usualPrice = usual.unitPrice ?? p.unitPrice ?? 0;
      const saving = round2((usualPrice - cheapest.unitPrice) * (usual.quantity || 0));
      return { p, cheapest, saving };
    })
    .filter((d) => d.saving >= 2)
    .sort((a, b) => b.saving - a.saving)[0];
  if (storeDeal) {
    insights.push({
      tone: "tip",
      title: "Opportunité d’économie",
      body: `${storeDeal.p.name} coûte ${money(storeDeal.cheapest.unitPrice)}/${storeDeal.p.unit} chez ${storeDeal.cheapest.store}. En l’achetant là, vous économiseriez ~${money(storeDeal.saving)} par mois.`,
    });
  } else {
    const trim = subStats.find((s) => !["viande", "legumes", "fruits"].includes(slugify(s.name)) && s.total >= 20);
    if (trim) {
      insights.push({
        tone: "tip",
        title: "Opportunité d’économie",
        body: `Vous pourriez réduire les achats de ${trim.name.toLowerCase()} de ~${money(round2(trim.total * 0.25))}/mois.`,
      });
    }
  }
  const pricey = prices
    .filter((p) => (p.deltaPct ?? 0) >= 12)
    .sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0))[0];
  if (pricey && pricey.unitPrice != null) {
    insights.push({
      tone: "info",
      title: "Prix élevés détectés",
      body: `Le prix moyen de « ${pricey.name.toLowerCase()} » (${money(pricey.unitPrice)}/${pricey.unit}) est ${pricey.deltaPct} % plus élevé que votre moyenne des 3 derniers mois.`,
    });
  }

  return {
    category: {
      id: category.id,
      name: category.name,
      color: category.color,
      kind: category.kind,
      icon: isIconKey(category.icon) ? category.icon : iconForCategory(category.name),
    },
    monthKey,
    months,
    kpis: {
      total,
      prevTotal,
      totalDelta: pct(total, prevTotal),
      transactions: current.length,
      prevTransactions: previous.length,
      transactionsDelta: pct(current.length, previous.length),
      visits: new Set(current.map(visitKey)).size,
      average: avg,
      averageDelta: pct(avg, prevAvg),
      subCount: subs.length,
      activeSubCount: subStats.filter((s) => s.total > 0).length,
      mainMerchants: mainMerchants.map((m) => m.store),
      beforeQuarterTotal: sum(beforeQuarter),
    },
    subcategories: subStats,
    products: { month: productsMonth, quarter: productsQuarter, half: productsHalf },
    merchants,
    persons,
    heatmap: {
      month: heatmap(current),
      half: heatmap(rows),
    },
    prices,
    insights,
  };
}

export type SubcategoryAnalytics = NonNullable<ReturnType<typeof subcategoryAnalytics>>;
