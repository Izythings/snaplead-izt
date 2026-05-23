import { Link } from "react-router-dom";
import { leadName } from "../lib/constants";
import type { LeadWithCapture } from "../lib/types";
import ConfidenceBadge from "./ConfidenceBadge";

export default function LeadCard({ lead, index }: { lead: LeadWithCapture; index?: number }) {
  return (
    <Link to={`/leads/${lead.id}`} className="surface block rounded p-4 transition hover:border-brick/50">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {index !== undefined && <span className="mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>}
            <h3 className="font-semibold">{leadName(lead)}</h3>
          </div>
          <p className="mt-1 text-sm text-muted">{lead.libelle_naf || lead.activite || "Métier non identifié"}</p>
        </div>
        <ConfidenceBadge score={lead.confidence_score} />
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <span className="text-muted">Ville</span>
          <div>{lead.ville || lead.departement || "-"}</div>
        </div>
        <div>
          <span className="text-muted">Téléphone</span>
          <div className="mono">{lead.telephone || "-"}</div>
        </div>
        <div>
          <span className="text-muted">Statut</span>
          <div>{lead.status}</div>
        </div>
      </div>
    </Link>
  );
}
