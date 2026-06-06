import type { LeadStatus, LeadWithCapture } from "../shared/types";

export const statusLabels: Record<LeadStatus, string> = {
  identified: "Identifié",
  enriched: "Enrichi",
  actionable: "À contacter",
  contacted: "Contacté",
  archived: "Archivé",
};

export const leadName = (lead: { nom_commercial?: string | null; raison_sociale?: string | null }) =>
  lead.nom_commercial || lead.raison_sociale || "Lead sans nom";

export const activityOf = (lead: LeadWithCapture) => lead.libelle_naf || lead.activite || "Activité non identifiée";

export const compareText = (a: string, b: string) => a.localeCompare(b, "fr", { sensitivity: "base" });

export const formatLeadDate = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export const phoneHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

export const websiteHref = (site: string) => (site.startsWith("http") ? site : `https://${site}`);
