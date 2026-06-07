ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS has_website BOOLEAN,
  ADD COLUMN IF NOT EXISTS gbp_place_id TEXT,
  ADD COLUMN IF NOT EXISTS gbp_rating NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS gbp_review_count INTEGER,
  ADD COLUMN IF NOT EXISTS gbp_business_status TEXT,
  ADD COLUMN IF NOT EXISTS gbp_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS digital_segment TEXT,
  ADD COLUMN IF NOT EXISTS suggested_offer TEXT,
  ADD COLUMN IF NOT EXISTS digital_checked_at TIMESTAMPTZ;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_digital_segment_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_digital_segment_check
  CHECK (digital_segment IN ('mature_visible', 'gbp_sans_site', 'invisible', 'inconnu'));

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_suggested_offer_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_suggested_offer_check
  CHECK (suggested_offer IN ('crm', 'package_site_crm', 'crm_low_prio', 'manuel'));

CREATE INDEX IF NOT EXISTS idx_leads_digital_segment ON leads(digital_segment);
CREATE INDEX IF NOT EXISTS idx_leads_suggested_offer ON leads(suggested_offer);
CREATE INDEX IF NOT EXISTS idx_leads_digital_checked_at ON leads(digital_checked_at DESC);
