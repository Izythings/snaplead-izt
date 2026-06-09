import { adminClient, authenticatedAccount, AuthenticationError } from "../_shared/api.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { qualifyCompany, qualifyContact } from "../_shared/qualification.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = adminClient();

  try {
    const body = await req.json();
    const leadIds = Array.isArray(body.lead_ids) ? body.lead_ids.filter(Boolean) : [];
    const scope = body.scope;
    if (leadIds.length === 0 || !["lead", "contacts", "both"].includes(scope)) {
      return json({ error: "lead_ids and scope (lead|contacts|both) are required" }, 400);
    }

    const { accountOwnerId } = await authenticatedAccount(req, supabase);
    const { data: selected, error: selectedError } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", accountOwnerId)
      .in("id", leadIds);
    if (selectedError) throw selectedError;

    const externalIds = [...new Set((selected ?? []).map((lead: any) => lead.source_external_id).filter(Boolean))];
    let groupRows = selected ?? [];
    if (externalIds.length > 0) {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", accountOwnerId)
        .in("source_external_id", externalIds);
      if (error) throw error;
      groupRows = [...groupRows, ...(data ?? [])];
    }
    const rows = [...new Map(groupRows.map((lead: any) => [lead.id, lead])).values()];
    const now = new Date().toISOString();

    if (scope === "lead" || scope === "both") {
      const groups = new Map<string, any[]>();
      for (const lead of rows) {
        const key = lead.source_external_id || lead.id;
        groups.set(key, [...(groups.get(key) ?? []), lead]);
      }
      for (const group of groups.values()) {
        const representative = group.find((lead) => lead.siren || lead.code_naf || lead.effectif) ?? group[0];
        const result = qualifyCompany(representative);
        const { error } = await supabase.from("leads").update({
          company_qualification_status: "qualified",
          company_qualification_score: result.score,
          company_qualification_reason: result.reason,
          company_qualified_at: now,
        }).in("id", group.map((lead) => lead.id));
        if (error) throw error;
      }
    }

    if (scope === "contacts" || scope === "both") {
      for (const lead of rows.filter((item: any) => item.contact_first_name || item.contact_last_name || item.email || item.contact_job_title)) {
        const result = qualifyContact(lead);
        const { error } = await supabase.from("leads").update({
          contact_qualification_status: "qualified",
          contact_qualification_score: result.score,
          contact_qualification_role: result.role,
          contact_qualification_reason: result.reason,
          contact_qualified_at: now,
        }).eq("id", lead.id);
        if (error) throw error;
      }
    }

    return json({ qualified: rows.length, scope });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : String(error) },
      error instanceof AuthenticationError ? 401 : 500,
    );
  }
});
