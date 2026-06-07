const normalize = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const hasAny = (value: string, terms: string[]) => terms.some((term) => value.includes(term));

const targetTerms = ["clim", "froid", "chauffage", "plomb", "electric", "maintenance", "batiment", "btp", "installation", "travaux"];
const excludedTerms = ["restaurant", "coiff", "boulanger", "snack", "boutique"];

const effectifScore = (value?: string | null) => {
  const numbers = normalize(value).match(/\d+/g)?.map(Number);
  if (!numbers?.length) return 0.45;
  const min = numbers[0];
  const max = numbers[numbers.length - 1];
  if (max <= 10) return 1;
  if (min <= 19) return 0.75;
  if (min <= 49) return 0.35;
  return 0.1;
};

export const qualifyCompany = (lead: any) => {
  const activity = normalize([lead.activite, lead.libelle_naf, lead.code_naf].filter(Boolean).join(" "));
  const target = hasAny(activity, targetTerms);
  const excluded = hasAny(activity, excludedTerms);
  const contactable = Boolean(lead.telephone || lead.email || lead.site_web);
  const identified = Boolean(lead.siren || lead.siret || lead.raison_sociale);
  const located = Boolean(lead.ville || lead.departement || lead.adresse_siege || lead.adresse);

  const score =
    (target ? 1 : excluded ? 0.05 : 0.45) * 0.4 +
    effectifScore(lead.effectif) * 0.25 +
    (contactable ? 1 : 0.2) * 0.15 +
    (identified ? 1 : 0.3) * 0.1 +
    (located ? 1 : 0.3) * 0.1;

  const reasons = [
    target ? "activité cible" : excluded ? "activité hors cible" : "activité à confirmer",
    lead.effectif ? `effectif ${lead.effectif}` : "effectif inconnu",
    contactable ? "canal de contact disponible" : "aucun canal direct",
  ];
  return { score: Math.round(score * 100) / 100, reason: reasons.join(" · ") };
};

export const qualifyContact = (lead: any) => {
  const title = normalize(lead.contact_job_title);
  let score = 25;
  let role = "À qualifier";
  let reason = "Fonction insuffisamment précise.";

  if (hasAny(title, ["gerant", "president", "directeur general", "managing director", "founder", "fondateur", "co-founder", "cofondateur"])) {
    score = 92;
    role = "Décideur";
    reason = "Peut arbitrer l'achat, le budget et le déploiement.";
  } else if (hasAny(title, ["maintenance", "after-sales", "after sales", "sav", "operations", "exploitation", "technique"])) {
    score = 86;
    role = "Sponsor opérationnel";
    reason = "Porte directement les interventions, la maintenance ou le SAV.";
  } else if (hasAny(title, ["administratif", "financial", "financier", "daf", "office manager"])) {
    score = 78;
    role = "Influenceur";
    reason = "Peut valider les gains administratifs et le budget.";
  } else if (hasAny(title, ["business manager", "charge d'affaires", "commercial", "responsable d'affaires"])) {
    score = 72;
    role = "Influenceur";
    reason = "Connaît les affaires et les contraintes d'exécution.";
  } else if (hasAny(title, ["technicien", "frigoriste", "chauffage", "climatisation", "installateur"])) {
    score = 48;
    role = "Utilisateur terrain";
    reason = "Peut confirmer les irritants terrain mais décide rarement de l'achat.";
  }

  if (lead.email) score += 5;
  if (lead.telephone) score += 3;
  if (lead.contact_linkedin) score += 2;
  return { score: Math.min(100, score) / 100, role, reason };
};
