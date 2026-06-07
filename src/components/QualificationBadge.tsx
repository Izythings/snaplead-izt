import type { QualificationStatus } from "../domain/shared/types";

export default function QualificationBadge({
  status,
  score,
  label = "Qualification",
}: {
  status?: QualificationStatus | null;
  score?: number | null;
  label?: string;
}) {
  if (status !== "qualified" || score === null || score === undefined) {
    return (
      <span className="inline-flex rounded-full border border-border bg-secondary px-2 py-1 text-[11px] font-semibold text-muted" aria-label={`${label} non qualifiée`}>
        N/A
      </span>
    );
  }

  const value = Math.round(score * 100);
  const tone = value >= 70 ? "border-success/30 bg-success/10 text-success" : value >= 40 ? "border-warning/30 bg-warning/10 text-warning" : "border-destructive/30 bg-destructive/10 text-destructive";
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold ${tone}`} aria-label={`${label} ${value} sur 100`}>{value}/100</span>;
}
