import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import { leadName } from "../domain/leads/lead";
import { relevanceScore } from "../domain/leads/relevance";
import type { LeadWithCapture } from "../domain/shared/types";
import ScoreChip from "./ScoreChip";
import StatusBadge from "./StatusBadge";

export default function LeadCard({ lead, index }: { lead: LeadWithCapture; index?: number }) {
  return (
    <article className="snap-panel transition-colors hover:border-ember/30">
      <div className="flex items-start gap-2 px-4 py-3">
        {index !== undefined && <span className="mono mt-1 text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>}
        <Link to={`/leads/${lead.id}`} className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-[15px] font-semibold">{leadName(lead)}</h3>
              <p className="mt-1 truncate text-xs text-muted">{lead.libelle_naf || lead.activite || "Métier non identifié"} · {lead.ville || lead.departement || "Zone inconnue"}</p>
            </div>
            <ScoreChip score={relevanceScore(lead)} label="Pertinence" />
          </div>
          <div className="mt-3">
            <StatusBadge status={lead.status} />
          </div>
        </Link>
        <div className="flex shrink-0">
          {lead.telephone && (
            <a href={`tel:${lead.telephone.replace(/\s/g, "")}`} className="grid h-11 w-10 place-items-center rounded-md text-muted hover:bg-accent hover:text-ember" aria-label={`Appeler ${leadName(lead)}`}>
              <Phone size={17} />
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="grid h-11 w-10 place-items-center rounded-md text-muted hover:bg-accent hover:text-ember" aria-label={`Envoyer un email à ${leadName(lead)}`}>
              <Mail size={17} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
