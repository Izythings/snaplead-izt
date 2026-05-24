import type { LeadWithCapture } from "./types";

const TARGET_ACTIVITY_TERMS = [
  "clim",
  "froid",
  "chauffage",
  "plomberie",
  "plombier",
  "electric",
  "électric",
  "maintenance",
  "artisan",
  "bâtiment",
  "btp",
  "installation",
  "travaux",
  "multi",
];

const EXCLUDED_ACTIVITY_TERMS = ["restaurant", "coiff", "boulanger", "bar ", "snack", "boutique"];

const normalize = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const parseYear = (value?: string | null) => {
  const match = value?.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
};

const parseEffectif = (value?: string | null, code?: string | null) => {
  const text = normalize(value);
  if (/1\s*a\s*2|1\s*ou\s*2/.test(text)) return { min: 1, max: 2 };
  if (/3\s*a\s*5/.test(text)) return { min: 3, max: 5 };
  if (/6\s*a\s*9/.test(text)) return { min: 6, max: 9 };
  if (/10\s*a\s*19/.test(text)) return { min: 10, max: 19 };
  if (/20\s*a\s*49/.test(text)) return { min: 20, max: 49 };
  const numeric = text.match(/\d+/g)?.map(Number);
  if (numeric?.length) return { min: numeric[0], max: numeric[numeric.length - 1] };
  const codeValue = Number(code);
  if (codeValue === 1 || codeValue === 2) return { min: 1, max: 2 };
  if (codeValue === 3) return { min: 3, max: 5 };
  if (codeValue === 11) return { min: 6, max: 9 };
  if (codeValue === 12) return { min: 10, max: 19 };
  if (codeValue === 21) return { min: 20, max: 49 };
  return null;
};

const pct = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 100);

export type RelevanceFactor = {
  label: string;
  detail: string;
  weight: number;
  score: number;
};

export const relevanceFactors = (lead: LeadWithCapture): RelevanceFactor[] => {
  const activity = normalize([lead.activite, lead.libelle_naf, lead.code_naf].filter(Boolean).join(" "));
  const targetHit = TARGET_ACTIVITY_TERMS.some((term) => activity.includes(normalize(term)));
  const excludedHit = EXCLUDED_ACTIVITY_TERMS.some((term) => activity.includes(normalize(term)));
  const effectif = parseEffectif(lead.effectif, lead.tranche_effectif_code);
  const ageYear = parseYear(lead.date_creation);
  const age = ageYear ? new Date().getFullYear() - ageYear : null;
  const hasContact = Boolean(lead.telephone || lead.email || lead.site_web);
  const hasDecisionContext = Boolean(lead.dirigeant || lead.raison_sociale);
  const local = Boolean(lead.departement || lead.ville || lead.adresse_siege || lead.captures?.exif_departement);

  const sizeScore = effectif
    ? effectif.max <= 10
      ? 1
      : effectif.min <= 19
        ? 0.75
        : effectif.min <= 49
          ? 0.35
          : 0.1
    : 0.45;

  const ageScore = age === null ? 0.45 : age >= 2 && age <= 20 ? 1 : age > 20 ? 0.65 : 0.35;

  return [
    {
      label: "Activité cible",
      detail: targetHit ? "Métier proche KarayCRM" : excludedHit ? "Métier hors cible détecté" : "Activité à qualifier",
      weight: 0.35,
      score: targetHit ? 1 : excludedHit ? 0.05 : 0.45,
    },
    {
      label: "Taille entreprise",
      detail: effectif ? `${effectif.min}-${effectif.max} salarié(s)` : "Effectif inconnu",
      weight: 0.25,
      score: sizeScore,
    },
    {
      label: "Âge / maturité",
      detail: age === null ? "Date de création inconnue" : `${age} an(s) d'activité`,
      weight: 0.15,
      score: ageScore,
    },
    {
      label: "Contactabilité",
      detail: hasContact ? "Téléphone, email ou site disponible" : "Aucun canal direct confirmé",
      weight: 0.15,
      score: hasContact ? 1 : 0.2,
    },
    {
      label: "Contexte commercial",
      detail: hasDecisionContext ? "Dirigeant ou identité légale disponible" : "Décideur non identifié",
      weight: 0.05,
      score: hasDecisionContext ? 1 : 0.35,
    },
    {
      label: "Zone exploitable",
      detail: local ? "Ville/département exploitable" : "Zone inconnue",
      weight: 0.05,
      score: local ? 1 : 0.3,
    },
  ];
};

export const relevanceScore = (lead: LeadWithCapture) => {
  const factors = relevanceFactors(lead);
  return factors.reduce((sum, factor) => sum + factor.weight * factor.score, 0);
};

export const relevanceLabel = (score?: number | null) => {
  const value = score ?? 0;
  if (value >= 0.75) return { label: "Très pertinent", color: "text-good", bg: "bg-good/10", border: "border-good/30" };
  if (value >= 0.55) return { label: "Pertinent", color: "text-brick", bg: "bg-brick/10", border: "border-brick/30" };
  if (value >= 0.35) return { label: "À qualifier", color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30" };
  return { label: "Hors cible", color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/30" };
};

export const relevancePercent = (lead: LeadWithCapture) => pct(relevanceScore(lead));
