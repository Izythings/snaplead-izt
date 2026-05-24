# CLAUDE.md — Scovio.io

## What

Personal PWA. Import terrain photos evening. Extract company info via Claude Vision. Enrich via Sirene/Pappers. Find similar companies same NAF+dept. Generate attack plan for next day.

NOT SaaS. Single user. No billing/teams/roles.

## Flow

```
Day: snap photos (vehicles, signs, construction panels, storefronts)
Evening: batch import → auto-process each:
  0. Parse EXIF → GPS coords + datetime → reverse geocode → city/dept
  1. Claude Vision → extract name/phone/url/email/activity/city
  2. Sirene (free) → Pappers (paid) → identify company (EXIF location as fallback if no city in image)
  3. Pappers search same NAF + same dept → 10 confrères
  4. Claude generate: script/email/angle per lead
Output: attack plan grouped by trade/zone, leads + confrères, copy-paste ready
Export: CSV download OR push to CRM via webhook (Zapier/Make/n8n/direct API)
```

## Stack

- Frontend: React + Vite + Tailwind, PWA, exifr (EXIF parsing client-side)
- Backend: Supabase (Postgres, Auth, Edge Functions, Storage)
- Vision: Claude API claude-sonnet-4-20250514
- Enrichment: Sirene INSEE (free) + Pappers API
- Reverse geocoding: api-adresse.data.gouv.fr/reverse (free, no key)
- Generation: Claude API
- Deploy: Vercel/Netlify

## Structure

```
leadsnap/
├── CLAUDE.md
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   └── functions/
│       ├── process-capture/    # vision + enrich
│       ├── search-confreres/   # pappers NAF+dept
│       ├── generate-plan/      # attack plan IA
│       └── webhook-push/       # push lead to CRM via webhook
├── src/
│   ├── App.tsx, main.tsx
│   ├── lib/ (supabase.ts, types.ts, constants.ts)
│   ├── hooks/ (useCaptures, useLeads, usePlan, useWebhooks)
│   ├── pages/
│   │   ├── Dashboard.tsx       # stats + quick access
│   │   ├── Import.tsx          # batch photo drop
│   │   ├── Captures.tsx        # processing list
│   │   ├── LeadDetail.tsx      # enriched lead + confrères
│   │   ├── PlanAttaque.tsx     # next day plan
│   │   └── Settings.tsx        # webhook configs + logs
│   └── components/
│       ├── PhotoDropzone.tsx   # drag&drop multi
│       ├── CaptureCard.tsx
│       ├── LeadCard.tsx
│       ├── ConfreresList.tsx
│       ├── PlanGroup.tsx       # trade/zone group
│       ├── ScriptDisplay.tsx
│       └── ConfidenceBadge.tsx
├── public/ (manifest.json, sw.js)
├── package.json, vite.config.ts, tailwind.config.ts
```

## DB Schema

### captures
```sql
CREATE TABLE captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  photo_path TEXT NOT NULL,
  photo_url TEXT,
  -- EXIF metadata (parsed client-side before upload)
  exif_lat DOUBLE PRECISION,             -- GPS latitude
  exif_lng DOUBLE PRECISION,             -- GPS longitude
  exif_taken_at TIMESTAMPTZ,             -- DateTimeOriginal
  exif_city TEXT,                        -- reverse geocoded city
  exif_departement TEXT,                 -- reverse geocoded dept
  exif_address TEXT,                     -- reverse geocoded address
  status TEXT NOT NULL DEFAULT 'pending', -- pending|processing|done|failed
  extracted_data JSONB,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  user_id UUID NOT NULL DEFAULT auth.uid()
);
```

### leads
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id UUID REFERENCES captures(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- from photo
  nom_commercial TEXT, telephone TEXT, site_web TEXT, email TEXT,
  activite TEXT, ville TEXT, adresse TEXT,
  -- from sirene/pappers
  raison_sociale TEXT, siren TEXT, siret TEXT,
  code_naf TEXT, libelle_naf TEXT,
  date_creation TEXT, dirigeant TEXT,
  effectif TEXT, tranche_effectif_code TEXT,
  chiffre_affaires TEXT, adresse_siege TEXT, departement TEXT,
  -- scores
  confidence_score REAL, -- 0-1, identification reliability only: Sirene/SIRET/address/contact/source matching
  source_matching TEXT, -- sirene|pappers|manual
  -- IA generated
  resume_business TEXT, angle_approche TEXT,
  script_appel TEXT, email_prospection TEXT,
  -- mgmt
  status TEXT NOT NULL DEFAULT 'identified', -- identified|enriched|actionable|contacted|archived
  notes TEXT,
  is_from_photo BOOLEAN NOT NULL DEFAULT TRUE, -- FALSE=confrère
  parent_lead_id UUID REFERENCES leads(id),
  user_id UUID NOT NULL DEFAULT auth.uid()
);
```

### plans
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_cible DATE NOT NULL DEFAULT CURRENT_DATE + 1,
  contenu JSONB,
  lead_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft', -- draft|ready|done
  user_id UUID NOT NULL DEFAULT auth.uid()
);
```

### webhook_configs
```sql
CREATE TABLE webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,                            -- "HubSpot", "Pipedrive", "Make", "Zapier", "n8n", "Custom"
  url TEXT NOT NULL,                             -- webhook endpoint URL
  headers JSONB DEFAULT '{}',                    -- custom headers (auth tokens, content-type overrides)
  trigger_on TEXT NOT NULL DEFAULT 'manual',     -- manual | on_enriched | on_actionable | on_contacted
  field_mapping JSONB DEFAULT '{}',              -- map lead fields to CRM fields (optional)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  user_id UUID NOT NULL DEFAULT auth.uid()
);
```

### webhook_logs
```sql
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  webhook_config_id UUID REFERENCES webhook_configs(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  request_payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  user_id UUID NOT NULL DEFAULT auth.uid()
);
```

### RLS + indexes
```sql
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own" ON captures FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON leads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON webhook_configs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON webhook_logs FOR ALL USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('captures', 'captures', FALSE);
CREATE POLICY "upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'captures' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "read" ON storage.objects FOR SELECT USING (bucket_id = 'captures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE INDEX idx_leads_naf ON leads(code_naf);
CREATE INDEX idx_leads_dept ON leads(departement);
CREATE INDEX idx_leads_capture ON leads(capture_id);
CREATE INDEX idx_leads_parent ON leads(parent_lead_id);
CREATE INDEX idx_captures_status ON captures(status);
CREATE INDEX idx_captures_date ON captures(created_at DESC);
```

## Edge Functions

### process-capture

Trigger: after each photo upload.

Steps:
1. Get image from Storage as base64
2. Read EXIF metadata from capture row (lat/lng/city/dept already parsed client-side)
3. Call Claude Vision → extract structured JSON
4. Merge: if Vision returned no city/address but EXIF has them → use EXIF values
5. Cascade: Sirene (free, by name+city) → Pappers (by name+city, or phone, or website)
6. Compute confidence score
7. Update capture status=done, create lead

Vision prompt:
```
Analyze photo of business signage (vehicle, storefront, construction panel, etc).
Extract visible commercial data. Return strict JSON:
{
  "nom_commercial": "str|null",
  "telephone": "str|null — french format 0X XX XX XX XX",
  "site_web": "str|null",
  "email": "str|null",
  "activite": "str|null — short trade description",
  "ville": "str|null",
  "adresse": "str|null",
  "indices_metier": ["keywords"],
  "type_support": "vehicule|enseigne|panneau_chantier|vitrine|local|stand|autre",
  "texte_brut_visible": "all readable text",
  "confidence": 0.0-1.0
}
Rules: no invention. null if uncertain. normalize phones. add https:// if missing.
```

Confidence scoring:
```
+0.4 SIREN confirmed by Sirene
+0.3 phone matches Pappers
+0.2 name fuzzy match raison sociale >80%
+0.2 website domain matches
+0.1 city matches (from Vision or EXIF fallback)
+0.1 NAF coherent with extracted activity
+0.05 EXIF GPS within 5km of company address
Cap 1.0. Display: >0.7 high, 0.4-0.7 medium, <0.4 low
```

### search-confreres

Trigger: after lead enrichment, if code_naf + departement exist.

```
GET https://api.pappers.fr/v2/recherche
  ?api_token={KEY}&code_naf={naf}&departement={dept}&statut_rcs=A&par_page=10
```
Optional: `&tranche_effectif_salarie={tranche}` if available.

Exclude lead's own SIREN. Create leads with is_from_photo=FALSE, parent_lead_id=source lead.

### generate-plan

Trigger: manual button "Generate attack plan".

Steps:
1. Get today's photo leads (is_from_photo=TRUE, created_at=today)
2. Get associated confrères
3. Group by trade (libelle_naf) then zone (dept/city)
4. Call Claude → generate plan JSON
5. Generate script+email per lead
6. Store in plans table, update leads status→actionable

Plan prompt:
```
B2B sales assistant. Given terrain leads + confrères, generate attack plan for tomorrow.

Per trade/zone group:
- Lead principal: personalized angle (mention terrain sighting), 30s call script, 3-4 line email
- Confrères: sector approach ("I work with several [trade] in your area"), call script each
- Recommended call order

Tone: direct, pro, not pushy. Mention physical sighting for main lead. Sector approach for confrères.

Return JSON:
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
```

### webhook-push

Trigger: manual button "Push to CRM" on lead, OR auto on lead status change if webhook trigger_on matches.

Steps:
1. Get lead data + associated capture EXIF
2. Get active webhook_configs matching trigger
3. For each config: build payload (apply field_mapping if set, else default payload)
4. POST to webhook URL with configured headers
5. Log request+response in webhook_logs
6. Show success/fail toast in UI

Default payload (sent if no field_mapping):
```json
{
  "source": "leadsnap",
  "lead": {
    "nom_commercial": "", "raison_sociale": "", "siren": "", "siret": "",
    "code_naf": "", "libelle_naf": "", "activite": "",
    "telephone": "", "email": "", "site_web": "",
    "adresse_siege": "", "ville": "", "departement": "",
    "dirigeant": "", "effectif": "", "chiffre_affaires": "",
    "date_creation": "",
    "confidence_score": 0.0, "source_matching": "",
    "is_from_photo": true, "parent_lead_id": null,
    "resume_business": "", "angle_approche": "",
    "script_appel": "", "email_prospection": "",
    "photo_lat": null, "photo_lng": null, "photo_time": null,
    "notes": ""
  }
}
```

Field mapping example (stored in webhook_configs.field_mapping):
```json
{
  "company": "raison_sociale",
  "phone": "telephone",
  "website": "site_web",
  "owner_name": "dirigeant",
  "description": "resume_business",
  "address": "adresse_siege",
  "industry": "libelle_naf"
}
```
If field_mapping set → output only mapped fields with CRM key names. If empty → send default full payload. Both work with Zapier/Make/n8n out of the box.

## APIs

### Claude
```
POST https://api.anthropic.com/v1/messages
model: claude-sonnet-4-20250514
Headers: x-api-key, content-type: application/json, anthropic-version: 2023-06-01
Vision: image as base64 [{type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}},{type:"text",text:prompt}]
```

### Sirene INSEE
```
GET https://api.insee.fr/entreprises/sirene/V3.11/siret
Auth: Bearer token (free account api.insee.fr). 30 req/min.
Search: ?q=denominationUniteLegale:"NOM" AND libelleCommuneEtablissement:"VILLE"&nombre=5
By SIREN: /siren/{siren}
```

### Pappers
```
Base: https://api.pappers.fr/v2. Auth: api_token query param.
Search: /recherche?api_token={key}&q={name}&code_postal={cp}
Company: /entreprise?api_token={key}&siren={siren}
Confrères: /recherche?api_token={key}&code_naf={naf}&departement={dept}&statut_rcs=A&par_page=10
```

### Reverse geocoding (FR gov, free)
```
GET https://api-adresse.data.gouv.fr/reverse/?lon={lng}&lat={lat}
Returns: city, postcode, departement, address. No key needed. No rate limit issues for personal use.
```

### Env vars
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... PAPPERS_API_KEY=... INSEE_CONSUMER_KEY=... INSEE_CONSUMER_SECRET=...
```

## UX

Scovio.io identity. Utilitarian B2B SaaS, tabular/ops, no fluff.
- Fonts: Geist (UI), JetBrains Mono (IDs/data only)
- Colors: Paper #FAFAF7, Ink #0E0E10, Signal #E2503E, Slate #3F3F46
- Thin border cards, 6-8px radius, no heavy shadows, dense but readable spacing

### Scoring

Keep two separate scores:
- **Confidence score**: reliability of the identified company. Based on SIREN/SIRET, legal identity, address/city/dept, phone/site/email, Sirene/Pappers/Vision matching. This answers: "is this the right company?"
- **Relevance score**: sales priority for KarayCRM. Based on activity fit, company size, age/maturity, contactability, decision-maker context, usable geography. This answers: "is this worth calling first?"

Do not merge these scores. A lead can be high confidence but low relevance, or low confidence but commercially interesting.

### Pages

**Import /import**: multi-photo dropzone, preview grid. On drop: parse EXIF (exifr) → extract GPS+datetime → reverse geocode via api-adresse.data.gouv.fr → store lat/lng/city/dept/taken_at with capture. "Launch" button, realtime progress via Supabase Realtime on captures.status

**Captures /captures**: today's list, thumbnail+status+name+score+EXIF city+time, click→lead, filters today/week/all

**Lead /leads/:id**:
- Top: photo, name+raison sociale, confidence badge, status, EXIF location+time if available
- Info: SIREN/SIRET, NAF, date, address, phone, web, dirigeant, effectif, CA
- Action: resume, angle, script (copyable), email (copyable)
- Confrères: list name/city/effectif/phone/dirigeant, click→detail
- Buttons: copy script, copy email, push to CRM, mark contacted, archive, notes

**Plan /plan**: "Generate" button, grouped trade/zone, main lead=highlighted "vu terrain", confrères below, numbered order, copy buttons, "Envoyer email" mailto button, "Push all to CRM" bulk button, summary top, CSV export

**Settings /settings**: webhook config CRUD (name, URL, headers, trigger, field mapping). Test button → sends sample payload → shows response. Webhook logs table: last 50, status, lead name, timestamp, success/fail badge. Presets: quick-fill URL patterns for Zapier (hooks.zapier.com), Make (hook.eu1.make.com), n8n (self-hosted URL)

**Dashboard /**: counters (captures/leads/confrères/contacted/pushed), quick links, last 5 captures

### PWA
```json
{"name":"Scovio.io","short_name":"Scovio","start_url":"/","display":"standalone","background_color":"#FAFAF7","theme_color":"#E2503E"}
```

## Next Steps

### Domain / Vercel
- Domain purchased: `scovi.io`.
- Add `scovi.io` and `www.scovi.io` to the Vercel project.
- DNS target:
  - `A @ -> 76.76.21.21`
  - `CNAME www -> cname.vercel-dns.com`
- Let Vercel issue SSL, then choose canonical redirect, probably `www.scovi.io -> scovi.io`.

### Email / Resend
- User has a Resend account.
- Use a mail subdomain to avoid mixing app hosting and email DNS: recommended `mail.scovi.io`.
- In Resend, add/verify `mail.scovi.io`, then copy DNS records to registrar.
- Short-term send path: Supabase Edge Function `send-email` calls Resend API.
- Sender candidates: `Pablo <pablo@mail.scovi.io>` or `Scovio <hello@mail.scovi.io>`.
- Reply path options:
  - Simple: set `reply_to` to an existing mailbox (e.g. Pablo's current mailbox).
  - CRM inbox: configure Resend inbound/MX for `mail.scovi.io`, point inbound webhook to Supabase, store replies and show them in Scovio.
- No Google Workspace required.

## Export

Two modes: CSV download + webhook push. Both available on lead detail (single) and plan page (bulk).

CSV format:
```csv
ordre,type,nom_commercial,raison_sociale,metier,ville,departement,telephone,email,site_web,dirigeant,effectif,photo_lat,photo_lng,photo_time,script_appel,email_prospection,score_confiance
```

## Sprints

1. **(1-2d)** Init Vite+React+Tailwind, Supabase (migrations/tables/storage/RLS), auth magic link, layout+routing, PWA
2. **(1-2d)** Import: dropzone multi, EXIF parse (exifr)+reverse geocode on drop, upload Storage, process-capture Edge Function (Vision extract), realtime status, Captures list
3. **(1-2d)** Enrichment: Sirene→Pappers cascade, matching+scoring, create lead, LeadDetail page
4. **(0.5-1d)** search-confreres, Pappers NAF+dept, confrères in LeadDetail
5. **(1-2d)** generate-plan, scripts/emails/angles, PlanAttaque page, copy buttons, CSV export
6. **(1d)** Webhook: Settings page (config CRUD, test, logs), webhook-push Edge Function, "Push to CRM" button on lead + bulk on plan, presets Zapier/Make/n8n
7. **(1d)** Dashboard, statuses, notes, mobile responsive, test real photos

## Rules

- No hidden bulk auto email sending. User-triggered sends only, with clear visible action.
- APIs only (Sirene, Pappers, Claude). No scraping.
- B2B data only. No personal data. No face recognition.
- Photos private in Storage.
- Cache Pappers: if SIREN in DB, skip API.
- Simple > perfect. Personal tool.
