import type { Lead } from "../../domain/shared/types";
import { renderTemplate } from "../../domain/email/render";
import {
  DEFAULT_J0_CSV_TEMPLATE,
  EMPTY_SALES_IDENTITY,
  type EmailTemplateInput,
  type SalesIdentityInput,
} from "../../domain/email/settings";
import { getEmailTimeWindow } from "../../domain/email/timeWindow";

export type CsvRow = Record<string, string>;
export type ImportLead = Partial<Lead> & { import_key: string };

const normalizeHeader = (value: string) =>
  value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const first = (row: CsvRow, keys: string[]) => {
  for (const key of keys) {
    const value = row[normalizeHeader(key)]?.trim();
    if (value) return value;
  }
  return "";
};

const hashKey = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const parseCsv = (source: string): CsvRow[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = (rows.shift() ?? []).map(normalizeHeader);
  return rows
    .filter((values) => values.some((value) => value.trim()))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
};

const parseLocation = (location: string) => {
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  const postalIndex = parts.findIndex((part) => /\b\d{5}\b/.test(part));
  const postal = postalIndex >= 0 ? parts[postalIndex].match(/\b(\d{5})\b/)?.[1] ?? "" : "";
  const city = postalIndex >= 0 ? parts[postalIndex].replace(postal, "").trim() : "";
  return { city, departement: postal.slice(0, 2), address: location };
};

export type ColdEmailImportSettings = {
  identity: SalesIdentityInput;
  template: Pick<EmailTemplateInput, "subject" | "body">;
};

const fallbackSettings: ColdEmailImportSettings = {
  identity: EMPTY_SALES_IDENTITY,
  template: DEFAULT_J0_CSV_TEMPLATE,
};

const emailContent = (
  lead: { lastName: string; company: string; city: string },
  settings: ColdEmailImportSettings,
) => {
  const variables = {
    nom: lead.lastName,
    entreprise: lead.company,
    ville: lead.city,
    fenetre_temps: getEmailTimeWindow(),
    calendly_url: settings.identity.calendly_url,
    signature: settings.identity.signature_html,
  };
  return {
    subject: renderTemplate(settings.template.subject, variables),
    body: renderTemplate(settings.template.body, variables),
  };
};

const companyFromRow = (row: CsvRow) => {
  const location = first(row, ["location", "adresse", "address", "adresse_siege"]);
  const parsedLocation = parseLocation(location);
  const company = first(row, ["name", "company", "entreprise", "raison_sociale", "nom_commercial", "lead_name"]);
  return {
    externalId: first(row, ["leadbay_id", "lead_id", "company_id", "id"]),
    company,
    sector: first(row, ["sector", "activite", "metier", "libelle_naf"]),
    codeNaf: first(row, ["code_naf", "naf", "ape", "code_ape"]),
    website: first(row, ["website", "site_web", "site"]),
    siren: first(row, ["siren"]),
    effectif: first(row, ["size", "effectif"]),
    description: first(row, ["description", "resume_business"]),
    linkedin: first(row, ["linkedin", "company_linkedin"]),
    location,
    city: first(row, ["ville", "city"]) || parsedLocation.city,
    departement: first(row, ["departement", "department"]) || parsedLocation.departement,
  };
};

export const buildImportedLeads = (
  companyRows: CsvRow[],
  contactRows: CsvRow[],
  settings: ColdEmailImportSettings = fallbackSettings,
): ImportLead[] => {
  const companies = new Map(companyRows.map((row) => {
    const company = companyFromRow(row);
    return [company.externalId || company.company.toLowerCase(), company] as const;
  }));

  const sourceRows = contactRows.length > 0 ? contactRows : companyRows;
  const imported: ImportLead[] = sourceRows.flatMap((row, index): ImportLead[] => {
    const contactCompanyId = first(row, ["lead_id", "leadbay_id", "company_id"]);
    const inlineCompany = companyFromRow(row);
    const company = companies.get(contactCompanyId) ?? companies.get(inlineCompany.company.toLowerCase()) ?? inlineCompany;
    const email = first(row, ["email", "email_address", "mail"]);
    const firstName = first(row, ["first_name", "firstname", "prenom"]);
    const lastName = first(row, ["last_name", "lastname", "nom"]);
    const companyName = company.company || first(row, ["lead_name", "company", "entreprise"]);
    if (!companyName && !email) return [];

    const emailTemplate = emailContent({ lastName, company: companyName, city: company.city }, settings);
    const suppliedBody = first(row, ["email_prospection", "body", "message"]);
    const suppliedSubject = first(row, ["subject", "objet"]);
    const identity = email || `${company.externalId || `${companyName}:${index}`}:${firstName}:${lastName}`;

    return [{
      import_key: `csv:${hashKey(identity.toLowerCase())}`,
      source_external_id: contactCompanyId || company.externalId || null,
      nom_commercial: companyName || null,
      raison_sociale: companyName || null,
      activite: company.sector || null,
      libelle_naf: company.sector || null,
      code_naf: company.codeNaf || null,
      site_web: company.website || null,
      siren: company.siren || null,
      effectif: company.effectif || null,
      resume_business: company.description || null,
      company_linkedin: company.linkedin || null,
      adresse: first(row, ["address", "adresse"]) || company.location || null,
      adresse_siege: company.location || null,
      ville: company.city || null,
      departement: company.departement || null,
      contact_first_name: firstName || null,
      contact_last_name: lastName || null,
      contact_job_title: first(row, ["job_title", "title", "poste", "fonction"]) || null,
      contact_linkedin: first(row, ["linkedin_page", "contact_linkedin", "linkedin"]) || null,
      dirigeant: [firstName, lastName].filter(Boolean).join(" ") || null,
      email: email || null,
      telephone: first(row, ["phone_number", "phone", "telephone", "tel"]) || null,
      angle_approche: suppliedSubject || emailTemplate.subject,
      email_prospection: suppliedBody || emailTemplate.body,
      status: email ? "actionable" : "identified",
      campaign_status: email ? "ready" : "not_started",
      confidence_score: null,
      source_matching: "csv_import",
      is_from_photo: false,
    }];
  });

  if (contactRows.length > 0) {
    const referencedCompanies = new Set(contactRows.map((row) => first(row, ["lead_id", "leadbay_id", "company_id"])).filter(Boolean));
    const companiesWithoutContacts = companyRows.filter((row) => {
      const company = companyFromRow(row);
      return !company.externalId || !referencedCompanies.has(company.externalId);
    });
    imported.push(...buildImportedLeads(companiesWithoutContacts, [], settings));
  }

  return Array.from(new Map(imported.map((lead) => [lead.import_key, lead])).values());
};

export const readCsvFile = async (file: File) => parseCsv(await file.text());
