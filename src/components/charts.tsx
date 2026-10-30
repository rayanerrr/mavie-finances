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
          const offset = slices.slice(0, index).reduce((sum, prior) => sum + (prior.value / total) * circumference, 0);
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
              strokeDashoffset={-offset}
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
  // Les deux props restent acceptées pour préserver les appels existants.
}: {
  series: EvolutionMonth[];
  categoryNames: string[];
  mode?: "category" | "total";
}) {
  const width = 640;
  const height = 260;
  const left = 58;
  const right = 16;
  const topMargin = 16;
  const bottom = 42;
  const maxTotal = Math.max(...series.map((s) => s.total), 1);
  const step = niceStep(maxTotal / 4);
  const top = step * 4;
  const ticks = [4, 3, 2, 1, 0].map((i) => i * step);

  const withData = series.filter((s) => s.total > 0);
  const average = withData.length
    ? withData.reduce((sum, s) => sum + s.total, 0) / withData.length
    : 0;

  const plotWidth = width - left - right;
  const plotHeight = height - topMargin - bottom;
  const x = (index: number) => left + (series.length <= 1 ? plotWidth / 2 : (index / (series.length - 1)) * plotWidth);
  const y = (value: number) => topMargin + plotHeight - (value / top) * plotHeight;
  const line = series.map((item, index) => `${x(index)},${y(item.total)}`).join(" ");

  return <div className="evo chart-tooltip" aria-label="Évolution des dépenses sur six mois">
    <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img">
      {ticks.map((tick) => <g key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="rgba(255,255,255,.08)" /><text x={left - 8} y={y(tick) + 4} textAnchor="end">{formatMoneyShort(tick)}</text></g>)}
      {average > 0 && <g><line x1={left} x2={width - right} y1={y(average)} y2={y(average)} stroke="var(--warn)" strokeDasharray="4 4" /><text x={width - right} y={y(average) - 6} textAnchor="end">Moyenne {formatMoneyShort(average)}</text></g>}
      <polyline points={line} fill="none" stroke="#3987e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {series.map((item, index) => <g key={item.monthKey}>
        <circle cx={x(index)} cy={y(item.total)} r="5" fill="var(--sheet)" stroke="#3987e5" strokeWidth="3"><title>{`${shortMonth(item.monthKey)} : ${formatMoneyShort(item.total)}`}</title></circle>
        <text x={x(index)} y={height - 12} textAnchor="middle">{shortMonth(item.monthKey)}</text>
      </g>)}
    </svg>
    <span className="muted small">Survole un point pour voir le total du mois.</span>
  </div>;
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
