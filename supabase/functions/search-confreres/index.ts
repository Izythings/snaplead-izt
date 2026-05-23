import { adminClient, searchPappers } from "../_shared/api.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = adminClient();
  try {
    const { lead_id } = await req.json();
    if (!lead_id) throw new Error("lead_id is required");
    const { data: lead, error } = await supabase.from("leads").select("*").eq("id", lead_id).single();
    if (error) throw error;
    if (!lead.code_naf || !lead.departement) return json({ created: 0, reason: "missing code_naf or departement" });

    const data = await searchPappers({
      code_naf: lead.code_naf,
      departement: lead.departement,
      statut_rcs: "A",
      par_page: 10,
      tranche_effectif_salarie: lead.tranche_effectif_code,
    });

    const rows = (data?.resultats ?? [])
      .filter((item: any) => item.siren !== lead.siren)
      .slice(0, 10)
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
        script_appel: `Bonjour, je travaille avec plusieurs entreprises ${lead.libelle_naf ?? "de votre secteur"} dans votre zone. Vous auriez 15 minutes pour échanger sur votre fonctionnement commercial et chantier ?`,
      }));

    if (rows.length > 0) {
      await supabase.from("leads").upsert(rows, { onConflict: "siren" });
    }
    return json({ created: rows.length });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
