export type DigitalSegment = "mature_visible" | "gbp_sans_site" | "invisible" | "inconnu";
export type SuggestedOffer = "crm" | "package_site_crm" | "crm_low_prio" | "manuel";

export type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  googleMapsUri?: string;
};

type DigitalLead = {
  raison_sociale?: string | null;
  nom_commercial?: string | null;
  ville?: string | null;
  adresse?: string | null;
  adresse_siege?: string | null;
  effectif?: string | null;
  tranche_effectif_code?: string | null;
};

const normalize = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const postalCodes = (...values: Array<string | null | undefined>) =>
  new Set(values.flatMap((value) => value?.match(/\b\d{5}\b/g) ?? []));

export const effectifMinimum = (value?: string | null, code?: string | null) => {
  const text = normalize(value);
  const numeric = text.match(/\d+/g)?.map(Number);
  if (numeric?.length) return numeric[0];

  const codeValue = Number(code);
  if (codeValue === 1 || codeValue === 2) return 1;
  if (codeValue === 3) return 3;
  if (codeValue === 11) return 6;
  if (codeValue === 12) return 10;
  if (codeValue === 21) return 20;
  if (codeValue === 22) return 50;
  if (codeValue === 31) return 100;
  if (codeValue === 32) return 200;
  if (codeValue === 41) return 250;
  if (codeValue === 42) return 500;
  if (codeValue === 51) return 1000;
  if (codeValue === 52) return 2000;
  if (codeValue === 53) return 5000;
  return null;
};

export const hasHighActivity = (
  reviews?: number | null,
  effectif?: string | null,
  trancheEffectifCode?: string | null,
) => (reviews ?? 0) >= 15 || (effectifMinimum(effectif, trancheEffectifCode) ?? 0) >= 3;

export const addressMatchesLead = (lead: DigitalLead, formattedAddress?: string | null) => {
  if (!formattedAddress) return false;

  const expectedPostalCodes = postalCodes(lead.adresse_siege, lead.adresse);
  const resultPostalCodes = postalCodes(formattedAddress);
  if (expectedPostalCodes.size > 0) {
    return [...expectedPostalCodes].some((postalCode) => resultPostalCodes.has(postalCode));
  }

  const city = normalize(lead.ville);
  return city.length >= 3 && normalize(formattedAddress).includes(city);
};

export const digitalSegment = (
  hasGbp: boolean,
  hasSite: boolean,
  addressMatches: boolean,
): DigitalSegment => {
  if (hasGbp && !addressMatches) return "inconnu";
  if (hasGbp && hasSite) return "mature_visible";
  if (hasGbp) return "gbp_sans_site";
  return "invisible";
};

export const suggestedOffer = (segment: DigitalSegment, highActivity: boolean): SuggestedOffer => {
  if (segment === "inconnu") return "manuel";
  if (segment === "gbp_sans_site") return "package_site_crm";
  if (segment === "mature_visible") return "crm";
  return highActivity ? "crm" : "crm_low_prio";
};

export const buildPlacesQuery = (lead: DigitalLead) => {
  const companyName = lead.nom_commercial || lead.raison_sociale;
  if (!companyName) return "";
  const postalCode = [...postalCodes(lead.adresse_siege, lead.adresse)][0];
  return [companyName, lead.ville, postalCode].filter(Boolean).join(" ").trim();
};

export const buildDigitalUpdate = (lead: DigitalLead, place?: GooglePlace | null) => {
  const hasGbp = Boolean(place);
  const addressMatches = !place || addressMatchesLead(lead, place.formattedAddress);
  if (hasGbp && !addressMatches) {
    return {
      website_url: null,
      has_website: null,
      gbp_place_id: null,
      gbp_rating: null,
      gbp_review_count: null,
      gbp_business_status: null,
      gbp_maps_url: null,
      digital_segment: "inconnu" as const,
      suggested_offer: "manuel" as const,
      digital_checked_at: new Date().toISOString(),
    };
  }

  const website = place?.websiteUri ?? null;
  const reviews = place?.userRatingCount ?? 0;
  const segment = digitalSegment(hasGbp, Boolean(website), addressMatches);
  const highActivity = hasHighActivity(reviews, lead.effectif, lead.tranche_effectif_code);

  return {
    website_url: website,
    has_website: Boolean(website),
    gbp_place_id: place?.id ?? null,
    gbp_rating: place?.rating ?? null,
    gbp_review_count: reviews,
    gbp_business_status: place?.businessStatus ?? null,
    gbp_maps_url: place?.googleMapsUri ?? null,
    digital_segment: segment,
    suggested_offer: suggestedOffer(segment, highActivity),
    digital_checked_at: new Date().toISOString(),
  };
};

export const buildUnknownDigitalUpdate = () => ({
  website_url: null,
  has_website: null,
  gbp_place_id: null,
  gbp_rating: null,
  gbp_review_count: null,
  gbp_business_status: null,
  gbp_maps_url: null,
  digital_segment: "inconnu" as const,
  suggested_offer: "manuel" as const,
  digital_checked_at: new Date().toISOString(),
});
