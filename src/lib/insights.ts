import { monthTotal, totalsByCategory, totalsBySubcategory } from "@/lib/expenses";
import { monthlyEvolution } from "@/lib/evolution";
import { formatMoneyShort, monthName, previousMonthKey } from "@/lib/money";

export type Suggestion = {
  tone: "warn" | "info" | "good";
  icon: "gauge" | "fork" | "car" | "bulb";
  title: string;
  body: string;
};

function priorMonths(monthKey: string, count: number) {
  const keys: string[] = [];
  let key = monthKey;
  for (let i = 0; i < count; i += 1) {
    key = previousMonthKey(key);
    keys.push(key);
  }
  return keys;
}

export function buildInsights(monthKey: string) {
  const previous = previousMonthKey(monthKey);
  const current = monthTotal(monthKey, "expense");
  const prior = monthTotal(previous, "expense");
  const income = monthTotal(monthKey, "income");

  const currentCats = totalsByCategory(monthKey, "expense");
  const priorCats = totalsByCategory(previous, "expense");
  const priorMap = new Map(priorCats.map((c) => [c.categoryName, Number(c.total)]));

  const rising = currentCats
    .map((cat) => {
      const prevTotal = priorMap.get(cat.categoryName) ?? 0;
      const total = Number(cat.total);
      const delta = total - prevTotal;
      return {
        category: cat.categoryName,
        kind: cat.categoryKind,
        total,
        previous: prevTotal,
        delta,
        pct: prevTotal > 0 ? (delta / prevTotal) * 100 : null,
      };
    })
    .filter((item) => item.delta > 0.5)
    .sort((a, b) => b.delta - a.delta);

  let essential = 0;
  let discretionary = 0;
  for (const cat of currentCats) {
    const total = Number(cat.total);
    if (cat.categoryKind === "discretionary") discretionary += total;
    else essential += total;
  }

  const suggestions: Suggestion[] = [];

  const fixedCategories = new Set(["Logement", "Factures & Services"]);
  const subs = totalsBySubcategory(monthKey, undefined, "expense").filter(
    (s) => s.subcategoryName && !fixedCategories.has(s.categoryName),
  );
  const history = priorMonths(monthKey, 3).map((m) =>
    totalsBySubcategory(m, undefined, "expense"),
  );
  const topSub = subs[0];
  if (topSub) {
    const name = topSub.subcategoryName!;
    const past = history
      .map((rows) => Number(rows.find((r) => r.subcategoryName === name)?.total ?? 0))
      .filter((v) => v > 0);
    const avg = past.length ? past.reduce((a, b) => a + b, 0) / past.length : 0;
    const total = Number(topSub.total);
    const pct = avg > 0 ? ((total - avg) / avg) * 100 : null;
    suggestions.push({
      tone: pct !== null && pct > 0 ? "warn" : "info",
      icon: "gauge",
      title: `Vous dépensez ${formatMoneyShort(total)} en ${name.toLowerCase()} ce mois-ci.`,
      body:
        pct === null
          ? "C’est votre plus gros poste en détail ce mois-ci."
          : Math.abs(pct) < 3
            ? "C’est stable par rapport à votre moyenne."
            : pct >= 0
            ? `C’est ${pct.toFixed(0)}% de plus que votre moyenne.`
            : `C’est ${Math.abs(pct).toFixed(0)}% de moins que votre moyenne.`,
    });
  }

  const risingWithPct = rising.find((r) => r.pct !== null && r.pct >= 10);
  if (risingWithPct) {
    suggestions.push({
      tone: "warn",
      icon: "fork",
      title: `Vos dépenses de ${risingWithPct.category.toLowerCase()} ont augmenté de ${risingWithPct.pct!.toFixed(0)}%.`,
      body: `Vous avez dépensé ${formatMoneyShort(risingWithPct.total)} vs ${formatMoneyShort(risingWithPct.previous)} le mois dernier.`,
    });
  }

  const discretionaryCats = currentCats
    .filter((c) => c.categoryKind === "discretionary")
    .sort((a, b) => Number(b.total) - Number(a.total));
  const potentialSavings = Math.round(
    rising
      .filter((r) => r.kind === "discretionary")
      .reduce((sum, r) => sum + r.delta * 0.5, 0) +
      discretionary * 0.15,
  );
  if (potentialSavings >= 10 && discretionaryCats.length) {
    const names = discretionaryCats
      .slice(0, 2)
      .map((c) => c.categoryName.toLowerCase())
      .join(" et ");
    suggestions.push({
      tone: "good",
      icon: "car",
      title: `Vous pourriez économiser ~${formatMoneyShort(potentialSavings)}/mois`,
      body: `En réduisant les dépenses ${names}.`,
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      tone: "info",
      icon: "bulb",
      title: "Pas encore assez de données.",
      body: "Ajoutez vos reçus pour obtenir des conseils.",
    });
  }

  const deltaTotal = Number(current.total) - Number(prior.total);
  const deltaPct =
    Number(prior.total) > 0 ? (deltaTotal / Number(prior.total)) * 100 : null;

  return {
    monthKey,
    previousMonthKey: previous,
    previousMonthName: monthName(previous),
    currentTotal: Number(current.total),
    previousTotal: Number(prior.total),
    incomeTotal: Number(income.total),
    deltaTotal,
    deltaPct,
    expenseCount: Number(current.count),
    essential,
    discretionary,
    essentialPct: Number(current.total) > 0 ? (essential / Number(current.total)) * 100 : 0,
    discretionaryPct:
      Number(current.total) > 0 ? (discretionary / Number(current.total)) * 100 : 0,
    potentialSavings,
    rising: rising.slice(0, 5),
    suggestions: suggestions.slice(0, 3),
    evolution: monthlyEvolution(monthKey, 6),
  };
}
