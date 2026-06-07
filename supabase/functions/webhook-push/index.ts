import { adminClient } from "../_shared/api.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";

const defaultPayload = (lead: any) => ({
  source: "leadsnap",
  lead: {
    nom_commercial: lead.nom_commercial,
    raison_sociale: lead.raison_sociale,
    siren: lead.siren,
    siret: lead.siret,
    code_naf: lead.code_naf,
    libelle_naf: lead.libelle_naf,
    activite: lead.activite,
    telephone: lead.telephone,
    email: lead.email,
    site_web: lead.site_web,
    adresse_siege: lead.adresse_siege,
    ville: lead.ville,
    departement: lead.departement,
    dirigeant: lead.dirigeant,
    effectif: lead.effectif,
    chiffre_affaires: lead.chiffre_affaires,
    date_creation: lead.date_creation,
    confidence_score: lead.confidence_score,
    source_matching: lead.source_matching,
    is_from_photo: lead.is_from_photo,
    parent_lead_id: lead.parent_lead_id,
    resume_business: lead.resume_business,
    angle_approche: lead.angle_approche,
    script_appel: lead.script_appel,
    email_prospection: lead.email_prospection,
    photo_lat: lead.captures?.exif_lat ?? null,
    photo_lng: lead.captures?.exif_lng ?? null,
    photo_time: lead.captures?.exif_taken_at ?? null,
    notes: lead.notes,
    contact_first_name: lead.contact_first_name,
    contact_last_name: lead.contact_last_name,
    contact_job_title: lead.contact_job_title,
    contact_linkedin: lead.contact_linkedin,
    campaign_status: lead.campaign_status,
  },
});

const campaignPayload = (lead: any) => ({
  leadId: lead.id,
  email: lead.email,
  firstName: lead.contact_first_name ?? "",
  lastName: lead.contact_last_name ?? "",
  company: lead.nom_commercial ?? lead.raison_sociale ?? "",
  jobTitle: lead.contact_job_title ?? "",
  subject: lead.angle_approche ?? `Prise de contact avec ${lead.nom_commercial ?? lead.raison_sociale ?? "votre entreprise"}`,
  body: lead.email_prospection ?? "",
  siret: lead.siret ?? "",
  siren: lead.siren ?? "",
  callbackUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/campaign-status`,
  callbackAuthorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}`,
  callbackToken: Deno.env.get("CAMPAIGN_CALLBACK_SECRET") ?? "",
});

const mappedPayload = (lead: any, mapping: Record<string, string>) => {
  const keys = Object.keys(mapping ?? {});
  if (keys.length === 0) return defaultPayload(lead);
  return Object.fromEntries(keys.map((crmKey) => [crmKey, lead[mapping[crmKey]] ?? lead.captures?.[mapping[crmKey]] ?? null]));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = adminClient();
  try {
    const body = await req.json();
    const trigger = body.trigger ?? "manual";
    const isCampaign = body.campaign === true;
    const authHeader = req.headers.get("authorization") ?? "";
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userData.user?.id ?? LOCAL_USER_ID;

    let lead = null;
    if (body.test) {
      lead = {
        id: null,
        user_id: userId,
        nom_commercial: "Atelier Pluvia",
        raison_sociale: "Atelier Pluvia SAS",
        telephone: "04 78 84 22 19",
        ville: "Villeurbanne",
        departement: "69",
        confidence_score: 0.92,
        captures: { exif_lat: 45.77, exif_lng: 4.88, exif_taken_at: new Date().toISOString() },
      };
    } else {
      const { data, error } = await supabase.from("leads").select("*, captures(*)").eq("id", body.lead_id).eq("user_id", userId).single();
      if (error) throw error;
      lead = data;
    }

    let query = supabase.from("webhook_configs").select("*").eq("user_id", userId).eq("is_active", true);
    if (body.config_id) query = query.eq("id", body.config_id);
    else query = query.eq("trigger_on", trigger);
    const { data: configs, error: configError } = await query;
    if (configError) throw configError;

    const results = [];
    for (const config of configs ?? []) {
      const payload = isCampaign ? campaignPayload(lead) : mappedPayload(lead, config.field_mapping ?? {});
      let status = 0;
      let responseBody = "";
      let success = false;
      try {
        const response = await fetch(config.url, {
          method: "POST",
          headers: { "content-type": "application/json", ...(config.headers ?? {}) },
          body: JSON.stringify(payload),
        });
        status = response.status;
        responseBody = await response.text();
        success = response.ok;
      } catch (error) {
        responseBody = error instanceof Error ? error.message : String(error);
      }
      await supabase.from("webhook_logs").insert({
        webhook_config_id: config.id,
        lead_id: lead.id,
        request_payload: payload,
        response_status: status || null,
        response_body: responseBody,
        success,
        user_id: userId,
      });
      results.push({ config_id: config.id, status, success });
    }
    if (!body.test && lead.id) {
      const now = new Date().toISOString();
      const campaignUpdate = isCampaign
        ? results.some((result) => result.success)
          ? { campaign_status: "queued", campaign_started_at: now, campaign_last_event_at: now, campaign_error: null }
          : { campaign_status: "failed", campaign_last_event_at: now, campaign_error: results.length === 0 ? "Aucun webhook actif configuré" : "Le webhook n8n a répondu en erreur" }
        : {};
      if (results.some((result) => result.success) || isCampaign) {
        await supabase.from("leads").update({
          ...campaignUpdate,
          ...(results.some((result) => result.success) ? { pushed_at: now } : {}),
        }).eq("id", lead.id);
      }
    }
    return json({ results });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
