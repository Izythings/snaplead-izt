import {
  adminClient,
  authenticatedAccount,
  AuthenticationError,
  callClaude,
  extractJson,
  getPappersCompany,
  normalizeCompany,
  scoreLead,
  searchPappers,
  searchSirene,
} from "../_shared/api.ts";
import { createConfreresForLead } from "../_shared/confreres.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { karayCrmContext } from "../_shared/sales-context.ts";
import { qualifyCompany } from "../_shared/qualification.ts";

const visionPrompt = `Analyze photo of business signage (vehicle, storefront, construction panel, etc).
Extract visible commercial data. Return strict JSON:
{
  "nom_commercial": "str|null",
  "telephone": "str|null - french format 0X XX XX XX XX",
  "site_web": "str|null",
  "email": "str|null",
  "activite": "str|null - short trade description",
  "ville": "str|null",
  "adresse": "str|null",
  "indices_metier": ["keywords"],
  "type_support": "vehicule|enseigne|panneau_chantier|vitrine|local|stand|autre",
  "texte_brut_visible": "all readable text",
  "confidence": 0.0-1.0
}
Rules: no invention. null if uncertain. normalize phones. add https:// if missing.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = adminClient();
  let captureId = "";
  let authorizedCapture = false;
  try {
    const { accountOwnerId } = await authenticatedAccount(req, supabase);
    const body = await req.json();
    captureId = body.capture_id;
    if (!captureId) throw new Error("capture_id is required");

    const { data: capture, error: captureError } = await supabase
      .from("captures")
      .select("*")
      .eq("id", captureId)
      .eq("user_id", accountOwnerId)
      .single();
    if (captureError) throw captureError;
    authorizedCapture = true;
    await supabase.from("captures").update({ status: "processing", error_message: null }).eq("id", captureId);

    const { data: fileData, error: fileError } = await supabase.storage.from("captures").download(capture.photo_path);
    if (fileError) throw fileError;
    const bytes = new Uint8Array(await fileData.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const base64 = btoa(binary);
    const mediaType = fileData.type || "image/jpeg";

    const claudeText = await callClaude([
      { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
      { type: "text", text: visionPrompt },
    ]);
    const extracted = extractJson(claudeText);
    if (!extracted.ville && capture.exif_city) extracted.ville = capture.exif_city;
    if (!extracted.adresse && capture.exif_address) extracted.adresse = capture.exif_address;

    const sirene = await searchSirene(extracted.nom_commercial, extracted.ville);
    let cached = null;
    const siren = sirene?.uniteLegale?.siren ?? sirene?.siren;
    if (siren) {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", accountOwnerId)
        .eq("siren", siren)
        .limit(1)
        .maybeSingle();
      cached = data;
    }
    const pappersSearch = cached ? null : await searchPappers({ q: extracted.nom_commercial, code_postal: null });
    const pappersSiren = cached?.siren ?? pappersSearch?.resultats?.[0]?.siren ?? siren;
    const pappers = cached ?? await getPappersCompany(pappersSiren);
    const normalized = normalizeCompany(sirene, pappers, extracted, capture);
    const companyQualification = qualifyCompany(normalized);

    const score = scoreLead({
      siren: Boolean(normalized.siren),
      phone: Boolean(extracted.telephone && pappers?.telephone && extracted.telephone === pappers.telephone),
      name: Boolean(normalized.raison_sociale && extracted.nom_commercial),
      domain: Boolean(extracted.site_web && pappers?.site_internet && extracted.site_web.includes(String(pappers.site_internet).replace(/^https?:\/\//, ""))),
      city: Boolean(normalized.ville && capture.exif_city && normalized.ville.toLowerCase().includes(capture.exif_city.toLowerCase())),
      naf: Boolean(normalized.code_naf && extracted.activite),
      gps: Boolean(capture.exif_lat && capture.exif_lng && normalized.adresse_siege),
    });

    const generationPrompt = `${karayCrmContext}

Generate French B2B sales fields for this lead.

Return strict JSON only:
{
  "resume_business": "short useful summary of the company and why it may fit KarayCRM",
  "angle_approche": "specific recommended angle for Pablo, using terrain context when available",
  "script_appel": "30-second cold call script in Pablo's voice",
  "email_prospection": "ready-to-send cold email following the mandatory KarayCRM email structure"
}

Rules:
- Personalize with trade, city/region, company size, and sighting context when available.
- The script must include the discovery question about current tools for quotes/interventions/planning.
- The email must follow the mandatory email structure from the seller context and include the Calendly link and full signature.
- Use the leader's reliable last name after "M." when available. Otherwise use "Bonjour," and do not invent a name.
- Ask for availability at the end of the current week or the beginning of the following week, whichever is chronologically appropriate.
- Keep it concise and ready to copy-paste.

Lead: ${JSON.stringify(normalized)}
Terrain context: ${JSON.stringify(capture)}
Extracted photo data: ${JSON.stringify(extracted)}`;
    const generated = extractJson(await callClaude([{ type: "text", text: generationPrompt }], 1400));

    const { data: lead, error: leadError } = await supabase.from("leads").insert({
      ...normalized,
      confidence_score: score,
      source_matching: normalized.siren ? "sirene+pappers" : "vision",
      resume_business: generated.resume_business,
      angle_approche: generated.angle_approche,
      script_appel: generated.script_appel,
      email_prospection: generated.email_prospection,
      status: normalized.siren ? "enriched" : "identified",
      capture_id: capture.id,
      user_id: capture.user_id,
      is_from_photo: true,
      company_qualification_status: "qualified",
      company_qualification_score: companyQualification.score,
      company_qualification_reason: companyQualification.reason,
      company_qualified_at: new Date().toISOString(),
    }).select("*").single();
    if (leadError) throw leadError;

    await supabase.from("captures").update({
      status: "done",
      extracted_data: extracted,
      processed_at: new Date().toISOString(),
    }).eq("id", captureId);

    let digital = null;
    try {
      const { data, error } = await supabase.functions.invoke("enrich-digital", {
        body: { lead_id: lead.id },
      });
      if (error) throw error;
      digital = data;
    } catch (digitalError) {
      console.error("enrich-digital-after-process failed", digitalError);
    }

    let confreres = { created: 0 };
    try {
      confreres = await createConfreresForLead(supabase, lead);
    } catch (confreresError) {
      console.error("search-confreres-after-process failed", confreresError);
    }

    return json({ lead: digital?.lead ?? lead, digital, confreres });
  } catch (error) {
    if (captureId && authorizedCapture) {
      await supabase.from("captures").update({ status: "failed", error_message: error instanceof Error ? error.message : String(error) }).eq("id", captureId);
    }
    return json(
      { error: error instanceof Error ? error.message : String(error) },
      error instanceof AuthenticationError ? 401 : 500,
    );
  }
});
