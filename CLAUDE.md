# CLAUDE.md - Scovi

## Product

Scovi is a single-user B2B prospecting CRM.

It ingests:

- terrain photos, automatically processed and company-qualified;
- manual CSV files, imported without automatic qualification.

It stores companies and contacts in the `leads` table, supports persistent qualification, bulk selection, filtering, cold-email campaign launch through n8n, and campaign event tracking.

Do not describe Scovi as webhook-first or as "not a CRM". CRM is now the product direction.

## Core Rules

### Qualification

- Manual CSV import must leave company and contact qualification at `pending` with null scores.
- Photo processing must qualify the company automatically.
- Never display a missing score as `0`; display `N/A`.
- Company and contact qualification are separate.
- Manual qualification scopes are `lead`, `contacts`, and `both`.
- Qualifying one imported row may update all rows sharing its `source_external_id`.
- Persist scores, roles, reasons and timestamps. Do not rely only on frontend calculations.
- Current manual qualification is deterministic and must not call Claude, Pappers or another paid API unless the product decision explicitly changes.

Company qualification uses:

- target activity and NAF;
- company size;
- contactability;
- legal identification;
- location.

Contact qualification uses:

- decision authority;
- operational proximity to interventions, maintenance or after-sales;
- administrative or commercial influence;
- field-user status;
- available contact channels.

### Imports

- `src/infrastructure/browser/leadImport.ts` parses CSV in the browser.
- It supports one combined CSV or separate company/contact CSV files.
- Keep import keys stable and idempotent.
- Reimporting a row must not erase an existing qualification.
- `source_external_id` groups contacts belonging to the same company.
- Manual imports use `source_matching = 'csv_import'` and `is_from_photo = false`.

### Campaigns

- Campaign launch acts on contacts with an email and status `ready` or `failed`.
- Campaign launch requires an active `manual` webhook configuration pointing to the production n8n webhook.
- Bulk launch must use the current explicit selection, not every filtered lead implicitly.
- n8n workflow source: `Documents/scovi_cold_email_sequence.json`.
- Campaign callback requires both Supabase JWT verification and `x-campaign-secret`.
- Never send `SUPABASE_SERVICE_ROLE_KEY` to n8n.
- Do not deploy `campaign-status` with `--no-verify-jwt`.

### Cold Email

The first email is direct and founder-led:

- acknowledge that the recipient receives many emails;
- introduce KarayCRM as an all-in-one tool for interventions, quotes, invoices and contracts;
- propose a low-commitment 15-minute video call;
- include `https://calendly.com/pablo-karaycrm/30min`;
- sign with Pablo's email, website and phone number.

Use `Bonjour M. [Nom],` only with a reliable last name. Otherwise use `Bonjour,`. Do not invent names. Do not mention pricing or the beta offer in the first email unless explicitly requested.

## Current User Flow

```txt
Photo:
upload -> EXIF -> Claude Vision -> Sirene/Pappers
-> automatic company qualification -> generated sales content

CSV:
parse companies + contacts -> merge -> upsert
-> company score N/A -> contact score N/A

CRM:
filter -> select rows -> qualify lead/contacts/both
-> select campaign-ready contacts -> launch n8n campaign
-> receive sent/follow-up/replied/completed status callbacks
```

## Architecture

```txt
src/
  domain/
    shared/types.ts
    shared/constants.ts
    leads/lead.ts
    leads/relevance.ts
    leads/contact.ts
  application/
    ports/dataGateway.ts
    services/importCapture.ts
    services/leadActions.ts
    services/webhookSettings.ts
  infrastructure/
    browser/exif.ts
    browser/image.ts
    browser/csv.ts
    browser/leadImport.ts
    supabase/client.ts
    supabase/repository.ts
  presentation/hooks/useRealtimeResource.ts
  hooks/
  pages/
  components/

supabase/
  migrations/
  functions/
    _shared/api.ts
    _shared/confreres.ts
    _shared/qualification.ts
    _shared/sales-context.ts
    process-capture/
    search-confreres/
    generate-plan/
    webhook-push/
    campaign-status/
    qualify-leads/
    enrich-digital/
```

Respect the existing layered architecture:

- domain code has no I/O;
- application services orchestrate ports;
- Supabase calls stay in infrastructure adapters or Edge Functions;
- pages coordinate UI state but should not duplicate business rules.

## Database

The migrations are the source of truth:

```txt
001_initial_schema.sql
002_no_auth_local_mode.sql
003_lead_import_campaigns.sql
004_qualification_workflow.sql
005_digital_footprint.sql
```

Important `leads` field groups:

- company identity: names, SIREN/SIRET, NAF, activity, size and location;
- contact identity: first name, last name, title, email, phone and LinkedIn;
- grouping: `import_key`, `source_external_id`, `parent_lead_id`;
- identification: `confidence_score`, `source_matching`;
- company qualification: status, score, reason and timestamp;
- contact qualification: status, score, role, reason and timestamp;
- campaign: status, timestamps, error and n8n execution ID;
- sales content: summary, angle, call script and cold email.

Qualification status values:

```txt
pending | qualified | failed
```

Campaign status values:

```txt
not_started | ready | queued | sent | follow_up_1 | follow_up_2
| replied | completed | failed | stopped
```

## Edge Functions

### `process-capture`

Downloads the photo, extracts visible data with Claude Vision, identifies the company through Sirene/Pappers, calculates identification confidence and company qualification, generates sales content, creates the lead, invokes `enrich-digital`, and optionally finds similar companies.

### `enrich-digital`

Accepts `{ "lead_id": "uuid" }`. Uses one Google Places API (New) Text Search call, validates the first result against the lead address, and persists the Google Business Profile fields, digital segment, suggested offer and check timestamp. A Google outage must not make `process-capture` fail; the function is independently rerunnable.

### `qualify-leads`

Accepts:

```json
{
  "lead_ids": ["uuid"],
  "scope": "lead|contacts|both"
}
```

It groups imported rows by `source_external_id`, persists company qualification across the group, and persists contact qualification per contact.

### `webhook-push`

For `campaign: true`, sends the contact and cold-email payload to active manual webhook configurations. On success it marks the campaign `queued`.

### `campaign-status`

Receives status callbacks from n8n. Protected by Supabase JWT plus `CAMPAIGN_CALLBACK_SECRET`.

### `search-confreres`

Uses Pappers to find active companies with the same NAF and department.

### `generate-plan`

Builds a call plan from current leads and generated sales content.

## UI Expectations

### Leads CRM

Must support:

- explicit row selection;
- select all filtered results;
- bulk qualification and campaign launch;
- filters for text, activity, NAF, size, score including `N/A`, source, qualification, campaign, email and dates;
- separate line and unique-company counts;
- responsive desktop and mobile behavior.

The large filter panel is sticky only from the `md` breakpoint. Making it sticky on mobile can cover row controls.

### Lead Detail

Shows:

- company and identification details;
- `N/A` for unqualified company scores;
- selected contact and all company contacts;
- persisted contact qualification;
- recommended decision, operational and administrative contacts;
- manual qualification menu;
- scripts, cold email, notes and campaign information.

Legacy `Push CRM` and `Push all` actions are intentionally hidden. Do not reintroduce them without a new product decision.

## Commands

```bash
npm install
npm run dev
npm run build
npm run test:e2e

supabase db push
supabase functions deploy process-capture enrich-digital search-confreres generate-plan webhook-push campaign-status qualify-leads
```

Required Supabase secrets:

```txt
ANTHROPIC_API_KEY
PAPPERS_API_KEY
INSEE_API_KEY
CAMPAIGN_CALLBACK_SECRET
GOOGLE_PLACES_API_KEY
```

`INSEE_CONSUMER_KEY` and `INSEE_CONSUMER_SECRET` remain supported as fallback credentials.

## Verification

Before completing a change:

1. Run `npm run build`.
2. Run `npm run test:e2e` for user-facing workflow changes.
3. Run `git diff --check`.
4. If schema or Edge Functions changed, apply/deploy them and verify remote state.

Current E2E coverage runs on desktop Chromium and Pixel 7 mobile emulation.

## Known Limitations

Not implemented:

- automatic web search for official company websites;
- website crawling for people or direct emails;
- Hunter/Dropcontact email verification;
- PagesJaunes scraping;
- teams, roles, billing or multi-tenant product behavior.

Do not implement PagesJaunes scraping without an explicit legal/product review.
