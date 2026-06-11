export type SalesIdentity = {
  display_name: string;
  phone: string;
  calendly_url: string;
  signature_html: string;
};

export const DEFAULT_IDENTITY: SalesIdentity = {
  display_name: "Pablo Zobda",
  phone: "0783667469",
  calendly_url: "https://calendly.com/pablo-karaycrm/30min",
  signature_html: "Pablo, fondateur de KarayCRM\n\npablo@karaycrm.fr\nkaraycrm.fr\n0783667469",
};

export const getSalesIdentity = async (supabase: any, userId: string): Promise<SalesIdentity> => {
  const { data, error } = await supabase
    .from("sales_identity")
    .select("display_name, phone, calendly_url, signature_html")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? DEFAULT_IDENTITY;
};

export const buildSalesContext = (identity: SalesIdentity) => `
Seller context for all generated outreach:
- Seller name: ${identity.display_name || "not configured"}.
- Seller phone: ${identity.phone || "not configured"}.
- Seller booking link: ${identity.calendly_url || "not configured"}.
- Seller email signature: ${identity.signature_html || "not configured"}.
- Product: KarayCRM, management software for artisans: quotes, invoices, field interventions, scheduling, maintenance contracts, jobsites. Works on phone and desktop. NF525 compliant.
- Target: French artisan TPEs, ideally 1 to 10 employees, especially HVAC/climatisation/froid, plumbing, electricity, and multi-trade service companies. France and Antilles.
- Main price argument: competitors often bill per user. For a 5-person team with full invoicing, tools like Organilog, Synchroteam, Extrabat can cost around 175 to 345 EUR/month plus setup fees up to 4000 EUR. KarayCRM bills per company: 59 EUR/month all included, no setup fee.
- Beta offer: full Pro access free for 6 months, value 354 EUR, no commitment, no credit card. In exchange: field feedback.
- Core discovery question: "Vous utilisez quoi aujourd'hui pour gérer vos devis, interventions et planning ?"
- If they use a tool: ask which one and whether they are satisfied.
- If they use Excel/paper: say this is exactly the use case KarayCRM was built for.
- Tone: direct, human, founder-led, conversational French. No buzzwords, no agency tone, no overpromising.
- Terrain angle: when the lead comes from a photo, mention the physical sighting naturally: vehicle, sign, storefront, city, street, or zone if available.
- Output should help the seller call or email immediately.
- Mandatory in generated call scripts: mention the configured seller name, mention KarayCRM by name, and ask what they currently use for quotes/interventions/planning.
- Mandatory email structure: brief acknowledgement that the recipient gets many emails, direct introduction of KarayCRM as an all-in-one tool for interventions, quotes, invoices and contracts, a low-commitment 15-minute video call, then the configured booking link.
- End emails with the configured seller signature exactly as provided.
- Use "Bonjour M. [Nom]," only when a reliable last name is available. Otherwise use "Bonjour," and never invent a name.
- Do not mention pricing or the beta offer in the first cold email unless the seller explicitly requests it.
- Never generate generic "I work with companies like yours" copy without tying it to KarayCRM's artisan management product.
`;

export const getSalesContext = async (supabase: any, userId: string) => {
  const identity = await getSalesIdentity(supabase, userId);
  return { identity, context: buildSalesContext(identity) };
};
