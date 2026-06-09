import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

export const adminClient = () =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

export class AuthenticationError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

export const isServiceRoleRequest = (req: Request) => {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return Boolean(token && token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
};

export const authenticatedAccount = async (req: Request, supabase: ReturnType<typeof adminClient>) => {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new AuthenticationError();

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) throw new AuthenticationError();

  const { data: membership, error: membershipError } = await supabase
    .from("account_members")
    .select("account_owner_id")
    .eq("user_id", userData.user.id)
    .single();
  if (membershipError || !membership) throw new AuthenticationError();

  return {
    userId: userData.user.id,
    accountOwnerId: membership.account_owner_id as string,
  };
};

export const extractJson = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Claude did not return JSON");
  return JSON.parse(match[0]);
};

export const callClaude = async (content: unknown[], maxTokens = 1800) => {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content }],
    }),
  });
  if (!response.ok) throw new Error(`Claude error ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data.content?.map((part: { text?: string }) => part.text ?? "").join("\n") ?? "";
};

export const sireneToken = async () => {
  const key = Deno.env.get("INSEE_CONSUMER_KEY");
  const secret = Deno.env.get("INSEE_CONSUMER_SECRET");
  if (!key || !secret) return null;
  const response = await fetch("https://api.insee.fr/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${key}:${secret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.access_token as string;
};

export const searchSirene = async (name?: string | null, city?: string | null) => {
  if (!name) return null;
  const q = city
    ? `denominationUniteLegale:"${name}" AND libelleCommuneEtablissement:"${city}"`
    : `denominationUniteLegale:"${name}"`;
  const url = `https://api.insee.fr/entreprises/sirene/V3.11/siret?q=${encodeURIComponent(q)}&nombre=5`;
  const apiKey = Deno.env.get("INSEE_API_KEY");
  const token = apiKey ? null : await sireneToken();
  if (!apiKey && !token) return null;
  const headers = apiKey ? { "X-INSEE-Api-Key-Integration": apiKey } : { authorization: `Bearer ${token}` };
  const response = await fetch(url, { headers });
  if (!response.ok) return null;
  const data = await response.json();
  return data.etablissements?.[0] ?? null;
};

export const searchPappers = async (params: Record<string, string | number | null | undefined>) => {
  const key = Deno.env.get("PAPPERS_API_KEY");
  if (!key) return null;
  const search = new URLSearchParams({ api_token: key });
  for (const [name, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") search.set(name, String(value));
  }
  const response = await fetch(`https://api.pappers.fr/v2/recherche?${search}`);
  console.log("[searchPappers] HTTP status", response.status);
  if (!response.ok) {
    console.error("[searchPappers] error response", await response.text());
    return null;
  }
  const data = await response.json();
  console.log("[searchPappers] raw result count", Array.isArray(data?.resultats) ? data.resultats.length : 0);
  return data;
};

export const getPappersCompany = async (siren?: string | null) => {
  const key = Deno.env.get("PAPPERS_API_KEY");
  if (!key || !siren) return null;
  const response = await fetch(`https://api.pappers.fr/v2/entreprise?api_token=${key}&siren=${siren}`);
  if (!response.ok) return null;
  return response.json();
};

export const scoreLead = (signals: {
  siren?: boolean;
  phone?: boolean;
  name?: boolean;
  domain?: boolean;
  city?: boolean;
  naf?: boolean;
  gps?: boolean;
}) => {
  let score = 0;
  if (signals.siren) score += 0.4;
  if (signals.phone) score += 0.3;
  if (signals.name) score += 0.2;
  if (signals.domain) score += 0.2;
  if (signals.city) score += 0.1;
  if (signals.naf) score += 0.1;
  if (signals.gps) score += 0.05;
  return Math.min(1, score);
};

export const normalizeCompany = (sirene: any, pappers: any, extracted: any, capture: any) => {
  const unite = sirene?.uniteLegale ?? {};
  const etab = sirene ?? {};
  const p = pappers ?? {};
  const denomination = p.nom_entreprise || unite.denominationUniteLegale || extracted.nom_commercial;
  return {
    nom_commercial: extracted.nom_commercial ?? p.nom_commercial ?? denomination,
    telephone: extracted.telephone ?? p.telephone,
    site_web: extracted.site_web ?? p.site_internet,
    email: extracted.email ?? p.email,
    activite: extracted.activite,
    ville: extracted.ville ?? capture.exif_city ?? p.siege?.ville,
    adresse: extracted.adresse ?? capture.exif_address,
    raison_sociale: denomination,
    siren: p.siren ?? unite.siren ?? etab.siren,
    siret: p.siege?.siret ?? etab.siret,
    code_naf: p.code_naf ?? unite.activitePrincipaleUniteLegale,
    libelle_naf: p.libelle_code_naf,
    date_creation: p.date_creation ?? unite.dateCreationUniteLegale,
    dirigeant: p.representants?.[0]?.nom_complet,
    effectif: p.effectif ?? p.tranche_effectif_salarie,
    tranche_effectif_code: p.tranche_effectif_salarie,
    chiffre_affaires: p.finances?.[0]?.chiffre_affaires ? String(p.finances[0].chiffre_affaires) : null,
    adresse_siege: p.siege?.adresse_ligne_1 ? `${p.siege.adresse_ligne_1}, ${p.siege.code_postal ?? ""} ${p.siege.ville ?? ""}` : null,
    departement: p.siege?.departement ?? capture.exif_departement,
  };
};
