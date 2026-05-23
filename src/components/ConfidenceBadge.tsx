import { confidenceLabel } from "../lib/constants";

export default function ConfidenceBadge({ score }: { score?: number | null }) {
  const meta = confidenceLabel(score);
  const pct = Math.round((score ?? 0) * 100);
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${meta.bg} ${meta.border}`}>
      <span className={`mono text-xs font-semibold ${meta.color}`}>{pct}/100</span>
      <span className="text-xs text-muted">{meta.label}</span>
    </div>
  );
}
