import { merchantMeta } from "@/lib/merchants";

export function MerchantLogo({
  merchantKey,
  store,
}: {
  merchantKey?: string | null;
  store?: string | null;
}) {
  const m = merchantMeta(merchantKey, store);
  const long = m.glyph.length > 2;
  return (
    <span
      className={`merchant-logo ${long ? "long" : ""}`}
      style={{ background: m.bg, color: m.fg }}
      title={m.label}
    >
      {m.glyph}
    </span>
  );
}

export function merchantLabel(merchantKey?: string | null, store?: string | null) {
  return merchantMeta(merchantKey, store).label;
}
