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

export const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";

export const confidenceLabel = (score?: number | null) => {
  const value = score ?? 0;
  if (value >= 0.7) return { label: "Score élevé", color: "text-success", bg: "bg-success/10", border: "border-success/30" };
  if (value >= 0.4) return { label: "Score moyen", color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" };
  return { label: "Score faible", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" };
};

export { leadName } from "../leads/lead";
