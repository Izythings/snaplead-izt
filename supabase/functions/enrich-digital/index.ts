import {
  adminClient,
  authenticatedAccount,
  AuthenticationError,
  isServiceRoleRequest,
} from "../_shared/api.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import {
  buildDigitalUpdate,
  buildPlacesQuery,
  buildUnknownDigitalUpdate,
  type GooglePlace,
} from "../_shared/digital.ts";

const fieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
  "places.googleMapsUri",
].join(",");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = adminClient();

  try {
    const accountOwnerId = isServiceRoleRequest(req)
      ? null
      : (await authenticatedAccount(req, supabase)).accountOwnerId;
    const body = await req.json();
    if (!body.lead_id) return json({ error: "lead_id is required" }, 400);

    let leadQuery = supabase.from("leads").select("*").eq("id", body.lead_id);
    if (accountOwnerId) leadQuery = leadQuery.eq("user_id", accountOwnerId);
    const { data: lead, error: leadError } = await leadQuery.single();
    if (leadError) throw leadError;

    const query = buildPlacesQuery(lead);
    let place: GooglePlace | null = null;

    if (query) {
      const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
      if (!apiKey) throw new Error("Missing GOOGLE_PLACES_API_KEY");

      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: "fr",
          regionCode: "FR",
          maxResultCount: 3,
        }),
      });
      if (!response.ok) {
        throw new Error(`Google Places error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      place = data.places?.[0] ?? null;
    }

    const update = query ? buildDigitalUpdate(lead, place) : buildUnknownDigitalUpdate();
    const { data: enrichedLead, error: updateError } = await supabase
      .from("leads")
      .update(update)
      .eq("id", lead.id)
      .select("*")
      .single();
    if (updateError) throw updateError;

    return json({ lead: enrichedLead });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, error instanceof AuthenticationError ? 401 : 500);
  }
});
