import { ExternalLink, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { contactName, contactQualification } from "../domain/leads/contact";
import type { LeadWithCapture } from "../domain/shared/types";
import CampaignBadge from "./CampaignBadge";
import QualificationBadge from "./QualificationBadge";

export default function ContactCard({ contact, selected = false }: { contact: LeadWithCapture; selected?: boolean }) {
  const qualification = contactQualification(contact);
  const scoreColor = qualification.score >= 80 ? "text-success" : qualification.score >= 65 ? "text-ember" : "text-muted";

  return (
    <article className={`snap-panel p-4 ${selected ? "border-ember/50 bg-ember/5" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{contactName(contact)}</h3>
            {selected && <span className="rounded-full bg-ember/10 px-2 py-0.5 text-[10px] font-semibold text-ember">Fiche ouverte</span>}
          </div>
          <p className="mt-1 text-sm text-muted">{contact.contact_job_title || "Fonction inconnue"}</p>
        </div>
        {contact.contact_qualification_status === "qualified"
          ? <div className={`mono text-lg font-bold ${scoreColor}`}>{qualification.score}</div>
          : <QualificationBadge status={contact.contact_qualification_status} score={contact.contact_qualification_score} label="Contact" />}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border bg-secondary px-2 py-1 text-[11px] font-semibold">{qualification.role}</span>
        <span className="rounded-full border border-border bg-secondary px-2 py-1 text-[11px] font-semibold">{qualification.priority}</span>
        <CampaignBadge status={contact.campaign_status ?? "not_started"} />
      </div>

      <p className="mt-3 text-xs leading-5 text-muted">{qualification.reason}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {!selected && <Link to={`/leads/${contact.id}`} className="snap-button-secondary px-3 py-1.5 text-xs">Voir la fiche</Link>}
        {contact.email && <a href={`mailto:${contact.email}`} className="snap-button-secondary px-3 py-1.5 text-xs"><Mail size={14} />Email</a>}
        {contact.telephone && <a href={`tel:${contact.telephone.replace(/\s/g, "")}`} className="snap-button-secondary px-3 py-1.5 text-xs"><Phone size={14} />Appeler</a>}
        {contact.contact_linkedin && <a href={contact.contact_linkedin} target="_blank" rel="noreferrer" className="snap-button-secondary px-3 py-1.5 text-xs"><ExternalLink size={14} />LinkedIn</a>}
      </div>
    </article>
  );
}
