import { CategoryIcon } from "@/components/icons";
import { iconForCategory } from "@/lib/classify";

export function CategoryChip({
  name,
  color,
}: {
  name: string | null;
  color: string | null;
}) {
  const c = color ?? "#64748b";
  return (
    <span className="cat-chip">
      <span className="cat-chip-icon" style={{ background: `${c}26`, color: c }}>
        <CategoryIcon icon={iconForCategory(name)} size={12} />
      </span>
      <span className="cat-chip-label" style={{ background: `${c}1f` }}>
        {name ?? "—"}
      </span>
    </span>
  );
}
