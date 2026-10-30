"use client";

import { formatMoneyShort } from "@/lib/money";

type Slice = { label: string; value: number; color: string };

export function DonutChart({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: Slice[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = 50;
  const stroke = 26;
  const circumference = 2 * Math.PI * radius;
  // Début de chaque part, calculé d'avance (pas de variable modifiée pendant le rendu).
  const offsets = slices.map((_, i) =>
    slices.slice(0, i).reduce((sum, x) => sum + (x.value / total) * circumference, 0),
  );

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut-svg" aria-hidden>
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
        />
        {slices.map((slice, index) => {
          const length = (slice.value / total) * circumference;
          const el = (
            <circle
              key={slice.label}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(length - 1, 0)} ${circumference - Math.max(length - 1, 0)}`}
              strokeDashoffset={-offsets[index]}
              transform="rotate(-90 70 70)"
            />
          );
          return el;
        })}
      </svg>
      <div className="donut-center">
        <strong>{centerValue}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  );
}

type EvolutionMonth = {
  monthKey: string;
  total: number;
  byCategory: Array<{ category: string; total: number; color: string }>;
};

function niceStep(raw: number) {
  if (raw <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * pow;
}

function shortMonth(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat("fr-CA", { month: "short" })
    .format(new Date(y, m - 1, 1))
    .replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function EvolutionChart({
  series,
  categoryNames,
  mode = "category",
}: {
  series: EvolutionMonth[];
  categoryNames: string[];
  mode?: "category" | "total";
}) {
  const maxTotal = Math.max(...series.map((s) => s.total), 1);
  const step = niceStep(maxTotal / 4);
  const top = step * 4;
  const ticks = [4, 3, 2, 1, 0].map((i) => i * step);

  const withData = series.filter((s) => s.total > 0);
  const average = withData.length
    ? withData.reduce((sum, s) => sum + s.total, 0) / withData.length
    : 0;

  const colorMap = new Map<string, string>();
  for (const month of series) {
    for (const cat of month.byCategory) colorMap.set(cat.category, cat.color);
  }

  const order = [...categoryNames].sort((a, b) => {
    const ta = series.reduce(
      (s, m) => s + (m.byCategory.find((c) => c.category === a)?.total ?? 0),
      0,
    );
    const tb = series.reduce(
      (s, m) => s + (m.byCategory.find((c) => c.category === b)?.total ?? 0),
      0,
    );
    return tb - ta;
  });

  return (
    <div className="evo">
      <div className="evo-y">
        {ticks.map((t) => (
          <span key={t}>{formatMoneyShort(t)}</span>
        ))}
      </div>
      <div className="evo-plot">
        <div className="evo-grid">
          {ticks.map((t) => (
            <i key={t} />
          ))}
        </div>
        {average > 0 && (
          <div className="evo-avg" style={{ bottom: `${(average / top) * 100}%` }}>
            <span>Moyenne: {formatMoneyShort(average)}</span>
          </div>
        )}
        <div className="evo-cols">
          {series.map((month) => (
            <div key={month.monthKey} className="evo-col">
              <div className="evo-bar-area">
                <div
                  className="evo-stack"
                  style={{ height: `${(month.total / top) * 100}%` }}
                  title={`${shortMonth(month.monthKey)} : ${formatMoneyShort(month.total)}`}
                >
                  {mode === "total" ? (
                    <span style={{ flexGrow: 1, background: "#3b82f6" }} />
                  ) : (
                    order.map((name) => {
                      const v =
                        month.byCategory.find((c) => c.category === name)?.total ?? 0;
                      if (v <= 0) return null;
                      return (
                        <span
                          key={name}
                          title={`${name} : ${formatMoneyShort(v)}`}
                          style={{ flexGrow: v, background: colorMap.get(name) }}
                        />
                      );
                    })
                  )}
                </div>
              </div>
              <span className="evo-label">{shortMonth(month.monthKey)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SubcategoryBars({
  items,
}: {
  items: Array<{ label: string; value: number; color: string; pct: number }>;
}) {
  const max = Math.max(...items.map((i) => i.pct), 1);
  return (
    <ul className="breakdown">
      {items.map((item) => (
        <li key={item.label}>
          <span className="breakdown-icon" style={{ background: item.color }}>
            {item.label.charAt(0).toUpperCase()}
          </span>
          <span className="breakdown-label">{item.label}</span>
          <span className="breakdown-track">
            <span style={{ width: `${(item.pct / max) * 100}%`, background: item.color }} />
          </span>
          <span className="breakdown-amount">{formatMoneyShort(item.value)}</span>
          <span className="breakdown-pct">{item.pct.toFixed(0)}%</span>
        </li>
      ))}
    </ul>
  );
}
