import { adminClient, authenticatedAccount, AuthenticationError } from "../_shared/api.ts";
import { createConfreresForLead } from "../_shared/confreres.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { getSalesIdentity } from "../_shared/sales-context.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = adminClient();
  try {
    const { accountOwnerId, userId } = await authenticatedAccount(req, supabase);
    const { lead_id } = await req.json();
    if (!lead_id) throw new Error("lead_id is required");
    const { data: lead, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .eq("user_id", accountOwnerId)
      .single();
    if (error) throw error;
    const identity = await getSalesIdentity(supabase, userId);
    return json(await createConfreresForLead(supabase, lead, identity));
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : String(error) },
      error instanceof AuthenticationError ? 401 : 500,
    );
  }
});
