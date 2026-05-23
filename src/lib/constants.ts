export const CSV_HEADERS = [
  "ordre",
  "type",
  "nom_commercial",
  "raison_sociale",
  "metier",
  "ville",
  "departement",
  "telephone",
  "email",
  "site_web",
  "dirigeant",
  "effectif",
  "photo_lat",
  "photo_lng",
  "photo_time",
  "script_appel",
  "email_prospection",
  "score_confiance",
];

export const confidenceLabel = (score?: number | null) => {
  const value = score ?? 0;
  if (value >= 0.7) return { label: "Score élevé", color: "text-good", bg: "bg-good/10", border: "border-good/30" };
  if (value >= 0.4) return { label: "Score moyen", color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30" };
  return { label: "Score faible", color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/30" };
};

export const leadName = (lead: { nom_commercial?: string | null; raison_sociale?: string | null }) =>
  lead.nom_commercial || lead.raison_sociale || "Lead sans nom";
