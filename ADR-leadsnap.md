# ADR — LeadSnap

**Date:** 2026-05-23
**Status:** GO
**Owner:** Pablo — Izythings

---

## Context

Field sales reps cross prospects daily (vehicles, signs, panels, storefronts) without capturing them. Manual process (note→Google→Sirene→Pappers→CRM→email) is slow, incomplete, abandoned. Signal lost at point of observation.

No existing tool does: visual terrain signal → company ID → enrichment → sales action → CRM export. Field sales tools (SPOTIO, SalesRabbit, Badger Maps) validate terrain need. Enrichment tools (Pappers, Sirene, Apollo) validate data need. None connect both from a photo.

## Decision

Build **LeadSnap**: personal PWA for visual field lead capture.

Core flow: **batch photo import → EXIF parse → Claude Vision extract → Sirene/Pappers identify → confrères search (same NAF+dept) → AI-generated attack plan → webhook push to CRM.**

Personal tool first. NOT SaaS, NOT CRM, NOT email sequencer.

## Scope — IN

- Batch photo import with EXIF GPS+datetime auto-parse
- Reverse geocoding via api-adresse.data.gouv.fr (free)
- Claude Vision extraction (name/phone/url/email/activity/city)
- Company matching: Sirene (free) → Pappers (paid), cascade by cost
- Confidence scoring (multi-signal: SIREN confirm, phone match, name fuzzy, domain, city, NAF, GPS proximity)
- Confrères search: Pappers by same NAF + same dept + similar effectif → 10 results
- AI generation: resume, angle, call script, email per lead
- Attack plan: grouped by trade/zone, main lead + confrères, recommended call order
- Webhook push to any CRM (Zapier/Make/n8n/direct). Field mapping configurable. Logs.
- CSV export
- PWA installable mobile

## Scope — OUT

- Multi-tenant / billing / teams / roles
- CRM features (pipeline, deals, tasks)
- Email sequences / cold email / LinkedIn automation
- Reporting / analytics
- Public API
- SSO
- Auto-sending emails or messages
- Premium contact enrichment (verified emails/phones)
- Territory management

## Architecture

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind, PWA, exifr | Fast, installable, EXIF client-side |
| Backend | Supabase (Postgres, Auth, Edge Functions, Storage) | Already mastered, RLS, Realtime, Edge Functions |
| Vision | Claude API claude-sonnet-4-20250514 | Multimodal > OCR on degraded terrain photos |
| Enrichment | Sirene INSEE (free) → Pappers API | Cost cascade, France data coverage |
| Reverse geocoding | api-adresse.data.gouv.fr | Free, no key, FR government |
| Generation | Claude API | Scripts, emails, attack plan |
| CRM integration | Webhook POST (configurable URL/headers/field mapping) | Universal: works with any CRM/Zapier/Make/n8n |
| Deploy | Vercel/Netlify | Simple, free tier sufficient |

## Key Decisions

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Product nature | Personal capture tool, not SaaS | Validate with own usage first |
| 2 | Usage pattern | Batch evening processing, not real-time terrain | Matches real commercial behavior, no network/speed friction |
| 3 | Extraction method | Claude Vision multimodal, not OCR | Handles dirty/angled/partial terrain photos |
| 4 | Enrichment cascade | Sirene (free) → Pappers (paid) | Cost control, free first |
| 5 | Confrères feature | Same NAF + same dept via Pappers search | 1 photo → 10 prospects, same trade pitch |
| 6 | CRM integration | Webhook-first, not native integrations | Universal compat, zero integration code, field mapping covers custom needs |
| 7 | Email/call actions | Generate only, never auto-send | Compliance, control, deliverability |
| 8 | EXIF metadata | Parse client-side (exifr), reverse geocode before upload | Auto city/dept without user input, improves matching |
| 9 | Plan d'attaque | Grouped by trade/zone, main lead + confrères | Batch calling same trade = consistent pitch, higher efficiency |
| 10 | Stack | Supabase + React + Claude API | Existing skills, fast iteration, low cost |

## Cost Structure

| Item | Cost | Volume control |
|---|---|---|
| Claude Vision | ~0.01-0.05€/image | Batch only, personal volume |
| Claude generation | ~0.01-0.03€/lead | Included in processing |
| Sirene API | Free | 30 req/min limit |
| Pappers API | Per plan (check quotas) | Cache by SIREN, skip if already in DB |
| Reverse geocoding | Free | FR gov API, no limit for personal use |
| Supabase | Free tier | Sufficient for personal use |
| Vercel/Netlify | Free tier | Sufficient for PWA |

**Estimated cost per photo processed:** 0.05-0.15€ (vision + enrichment + generation). At 10 photos/day = 1.50€/day max.

## Risks

| Risk | Impact | Response |
|---|---|---|
| Vision extraction fails on dirty photos | Critical | Claude multimodal handles degraded input well. EXIF fallback for location. Manual correction always available |
| Matching ambiguous (trade name ≠ legal name) | High | Multi-signal scoring (phone+city+NAF+domain). Show alternatives. Human validation required |
| Pappers API costs escalate | Medium | Cache SIREN results. Free Sirene first. Confrères search = 1 call per lead |
| Webhook target CRM rejects payload | Low | Test button in settings. Logs with full request/response. Field mapping for format adaptation |
| Habit not formed (tool not used daily) | High | Build for own use first. If I don't use it, nobody will. No market validation needed before personal tool |

## Validation Criteria

Personal tool = validate with own usage:

- I use it at least 3x/week
- I process at least 5 photos per session
- >60% of extractions give usable company match
- I actually call/email leads from the attack plan
- I push leads to CRM via webhook
- Time saved vs manual process: >15 min/session

If after 3 weeks I don't open it → kill or pivot.

## Sprints

1. **(1-2d)** Init: Vite+React+Tailwind, Supabase (tables/storage/RLS), auth, routing, PWA
2. **(1-2d)** Import: dropzone, EXIF+reverse geocode, upload, process-capture (Vision), realtime, Captures list
3. **(1-2d)** Enrichment: Sirene→Pappers cascade, matching+scoring, lead creation, LeadDetail page
4. **(0.5-1d)** Confrères: Pappers NAF+dept search, confrères in LeadDetail
5. **(1-2d)** Plan: generate-plan, scripts/emails/angles, PlanAttaque page, copy buttons, CSV export
6. **(1d)** Webhook: Settings page (config/test/logs), webhook-push function, push buttons (single+bulk)
7. **(1d)** Polish: Dashboard, statuses, notes, mobile responsive, real photo tests

**Total: 7-11 days**

## Dependencies Before Start

3 API keys needed (15 min setup):
1. Anthropic API key (already have)
2. Pappers API key (pappers.fr/api, free plan to start)
3. INSEE Sirene token (api.insee.fr, free account)

## Reference

Full technical spec: `CLAUDE.md` at repo root (schema, prompts, API endpoints, UX, structure).
