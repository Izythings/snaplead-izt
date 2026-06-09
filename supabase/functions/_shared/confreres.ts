import { searchPappers } from "./api.ts";

export const createConfreresForLead = async (supabase: any, lead: any) => {
  if (!lead?.id || !lead.code_naf || !lead.departement) {
    return { created: 0, reason: "missing code_naf or departement" };
  }

  const searchParams = {
    code_naf: lead.code_naf,
    departement: lead.departement,
    statut_rcs: "A",
    par_page: 10,
    tranche_effectif_salarie: lead.tranche_effectif_code,
  };
  console.log("[createConfreresForLead] searchPappers params", searchParams);
  const data = await searchPappers(searchParams);

  const results = (data?.resultats ?? []).filter((item: any) => item.siren && item.siren !== lead.siren).slice(0, 10);
  if (results.length === 0) return { created: 0 };

  const sirens = results.map((item: any) => item.siren);
  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("siren")
    .eq("user_id", lead.user_id)
    .in("siren", sirens);
  console.log("[createConfreresForLead] existing SIRENs", (existing ?? []).map((item: any) => item.siren));
  if (existingError) {
    console.error("[createConfreresForLead] dedup SELECT error", existingError);
  }
  const existingSirens = new Set((existing ?? []).map((item: any) => item.siren));

  const rows = results
    .filter((item: any) => !existingSirens.has(item.siren))
    .map((item: any) => ({
      nom_commercial: item.nom_entreprise,
      raison_sociale: item.nom_entreprise,
      siren: item.siren,
      siret: item.siege?.siret,
      code_naf: item.code_naf,
      libelle_naf: item.libelle_code_naf,
      dirigeant: item.representants?.[0]?.nom_complet,
      effectif: item.effectif,
      tranche_effectif_code: item.tranche_effectif_salarie,
      adresse_siege: item.siege?.adresse_ligne_1,
      ville: item.siege?.ville,
      departement: item.siege?.departement ?? lead.departement,
      telephone: item.telephone,
      site_web: item.site_internet,
      confidence_score: 0.65,
      source_matching: "pappers",
      status: "enriched",
      is_from_photo: false,
      parent_lead_id: lead.id,
      user_id: lead.user_id,
      angle_approche: `Même métier (${lead.libelle_naf ?? lead.code_naf}) dans le département ${lead.departement}.`,
      script_appel: `Bonjour, je suis Pablo, fondateur de KarayCRM. Je parle avec plusieurs artisans ${lead.libelle_naf ?? "de votre secteur"} dans votre zone sur la gestion devis, interventions et planning. Vous utilisez quoi aujourd'hui pour gérer ça ?`,
    }));

  console.log("[createConfreresForLead] rows before INSERT", rows.length);
  if (rows.length === 0) return { created: 0 };
  const { error } = await supabase.from("leads").insert(rows);
  if (error) throw error;
  return { created: rows.length };
};
