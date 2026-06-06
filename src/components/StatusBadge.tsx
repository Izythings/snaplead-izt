import type { LeadStatus } from "../domain/shared/types";

const statusMeta: Record<LeadStatus, { label: string; className: string }> = {
  identified: { label: "Nouveau", className: "bg-muted-surface/70 text-muted" },
  enriched: { label: "Enrichi", className: "bg-warning/15 text-warning" },
  actionable: { label: "À appeler", className: "bg-ember/15 text-ember" },
  contacted: { label: "Contacté", className: "bg-success/15 text-success" },
  archived: { label: "Écarté", className: "bg-destructive/15 text-destructive" },
};

export default function StatusBadge({ status }: { status: LeadStatus }) {
  const meta = statusMeta[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
