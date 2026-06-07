import type { LeadWithCapture } from "../shared/types";

export type ContactQualification = {
  score: number;
  role: "Décideur" | "Sponsor opérationnel" | "Influenceur" | "Utilisateur terrain" | "À qualifier";
  priority: "Priorité 1" | "Priorité 2" | "Priorité 3" | "Secondaire";
  reason: string;
};

const normalize = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const hasAny = (value: string, terms: string[]) => terms.some((term) => value.includes(term));

export const contactName = (lead: LeadWithCapture) =>
  [lead.contact_first_name, lead.contact_last_name].filter(Boolean).join(" ") || lead.dirigeant || "Contact à qualifier";

export const contactQualification = (lead: LeadWithCapture): ContactQualification => {
  if (lead.contact_qualification_status === "qualified" && lead.contact_qualification_score !== null) {
    const score = Math.round(lead.contact_qualification_score * 100);
    return {
      score,
      role: (lead.contact_qualification_role as ContactQualification["role"]) || "À qualifier",
      priority: score >= 90 ? "Priorité 1" : score >= 80 ? "Priorité 2" : score >= 65 ? "Priorité 3" : "Secondaire",
      reason: lead.contact_qualification_reason || "Qualification enregistrée.",
    };
  }

  if (lead.contact_qualification_status === "pending") {
    return {
      score: 0,
      role: "À qualifier",
      priority: "Secondaire",
      reason: "Contact non qualifié.",
    };
  }

  const title = normalize(lead.contact_job_title);
  const isDecisionMaker = hasAny(title, ["gerant", "president", "directeur general", "managing director", "founder", "fondateur", "co-founder", "cofondateur"]);
  const isOperationalSponsor = hasAny(title, ["maintenance", "after-sales", "after sales", "sav", "operations", "exploitation", "technique", "responsable technique"]);
  const isFinancialSponsor = hasAny(title, ["administratif", "financial", "financier", "daf", "office manager"]);
  const isBusinessInfluencer = hasAny(title, ["business manager", "charge d'affaires", "commercial", "responsable d'affaires"]);
  const isFieldUser = hasAny(title, ["technicien", "frigoriste", "chauffage", "climatisation", "installateur"]);

  let score = 25;
  let role: ContactQualification["role"] = "À qualifier";
  let reason = "Fonction insuffisamment précise pour estimer son influence.";

  if (isDecisionMaker) {
    score = 92;
    role = "Décideur";
    reason = "Peut arbitrer l'achat, le budget et le déploiement de KarayCRM.";
  } else if (isOperationalSponsor) {
    score = 86;
    role = "Sponsor opérationnel";
    reason = "Porte directement les interventions, la maintenance ou le SAV.";
  } else if (isFinancialSponsor) {
    score = 78;
    role = "Influenceur";
    reason = "Peut valider les gains administratifs, la facturation et le budget.";
  } else if (isBusinessInfluencer) {
    score = 72;
    role = "Influenceur";
    reason = "Connaît les affaires, les clients et les contraintes d'exécution.";
  } else if (isFieldUser) {
    score = 48;
    role = "Utilisateur terrain";
    reason = "Peut confirmer les irritants terrain, mais décide rarement de l'achat.";
  }

  if (lead.email) score += 5;
  if (lead.telephone) score += 3;
  if (lead.contact_linkedin) score += 2;
  score = Math.min(100, score);

  const priority: ContactQualification["priority"] =
    score >= 90 ? "Priorité 1" : score >= 80 ? "Priorité 2" : score >= 65 ? "Priorité 3" : "Secondaire";

  return { score, role, priority, reason };
};

export const rankContacts = (contacts: LeadWithCapture[]) =>
  [...contacts].sort((a, b) => contactQualification(b).score - contactQualification(a).score);
