import { adminClient } from "../_shared/api.ts";
import { createConfreresForLead } from "../_shared/confreres.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = adminClient();
  try {
    const { lead_id } = await req.json();
    if (!lead_id) throw new Error("lead_id is required");
    const { data: lead, error } = await supabase.from("leads").select("*").eq("id", lead_id).single();
    if (error) throw error;
    return json(await createConfreresForLead(supabase, lead));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
