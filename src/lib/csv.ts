import { CSV_HEADERS } from "./constants";
import type { LeadWithCapture } from "./types";

const clean = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).replaceAll('"', '""').replace(/\s+/g, " ").trim();
};

export const leadsToCsv = (leads: LeadWithCapture[]) => {
  const rows = leads.map((lead, index) => {
    const type = lead.is_from_photo ? "principal" : "confrere";
    const values = [
      index + 1,
      type,
      lead.nom_commercial,
      lead.raison_sociale,
      lead.libelle_naf || lead.activite,
      lead.ville,
      lead.departement,
      lead.telephone,
      lead.email,
      lead.site_web,
      lead.dirigeant,
      lead.effectif,
      lead.captures?.exif_lat,
      lead.captures?.exif_lng,
      lead.captures?.exif_taken_at,
      lead.script_appel,
      lead.email_prospection,
      lead.confidence_score,
    ];
    return values.map((value) => `"${clean(value)}"`).join(",");
  });

  return [CSV_HEADERS.join(","), ...rows].join("\n");
};

export const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
