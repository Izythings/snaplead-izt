export default function ScoreChip({ score, label }: { score?: number | null; label?: string }) {
  const value = Math.round((score ?? 0) * 100);
  const tone = value >= 70 ? "bg-success/15 text-success" : value >= 40 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive";
  return (
    <span className={`inline-flex items-baseline gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${tone}`} aria-label={`${label ?? "Score"} ${value} sur 100`}>
      {value}
      <span className="text-[10px] opacity-75">/100</span>
    </span>
  );
}
