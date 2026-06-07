import { adminClient } from "../_shared/api.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

const allowedStatuses = new Set([
  "queued",
  "sent",
  "follow_up_1",
  "follow_up_2",
  "replied",
  "completed",
  "failed",
  "stopped",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const configuredSecret = Deno.env.get("CAMPAIGN_CALLBACK_SECRET");
    const suppliedSecret = req.headers.get("x-campaign-secret");
    if (configuredSecret && suppliedSecret !== configuredSecret) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    if (!body.lead_id || !allowedStatuses.has(body.status)) {
      return json({ error: "lead_id and a valid status are required" }, 400);
    }

    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      campaign_status: body.status,
      campaign_last_event_at: now,
      campaign_error: body.error ?? null,
    };
    if (body.status === "replied") payload.campaign_replied_at = now;
    if (body.execution_id) payload.campaign_execution_id = String(body.execution_id);

    const supabase = adminClient();
    const { error } = await supabase.from("leads").update(payload).eq("id", body.lead_id);
    if (error) throw error;

    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
