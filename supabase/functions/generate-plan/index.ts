import { adminClient, callClaude, extractJson } from "../_shared/api.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = adminClient();
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userData.user?.id ?? LOCAL_USER_ID;

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { data: leads, error } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });
    if (error) throw error;

    const prompt = `B2B sales assistant. Given terrain leads + confreres, generate attack plan for tomorrow.
Per trade/zone group:
- Lead principal: personalized angle (mention terrain sighting), 30s call script, 3-4 line email
- Confreres: sector approach, call script each
- Recommended call order
Tone: direct, pro, not pushy. Mention physical sighting for main lead. Sector approach for confreres.
Return strict JSON:
{
  "date": "YYYY-MM-DD",
  "groupes": [{
    "metier": "str", "zone": "str", "contexte": "str",
    "lead_principal": {"lead_id":"uuid","nom":"str","angle":"str","script_appel":"str","email":"str"},
    "confreres": [{"lead_id":"uuid","nom":"str","accroche":"str","script_appel":"str"}],
    "ordre_recommande": ["uuid"]
  }],
  "resume_journee": "2 sentence summary"
}
Leads: ${JSON.stringify(leads ?? [])}`;

    const content = extractJson(await callClaude([{ type: "text", text: prompt }], 3000));
    const leadIds = Array.from(new Set((leads ?? []).map((lead: any) => lead.id)));
    const { data: plan, error: planError } = await supabase.from("plans").insert({
      contenu: content,
      lead_ids: leadIds,
      status: "ready",
      user_id: userId,
    }).select("*").single();
    if (planError) throw planError;
    if (leadIds.length > 0) {
      await supabase.from("leads").update({ status: "actionable" }).in("id", leadIds).neq("status", "contacted");
    }
    return json({ plan });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
