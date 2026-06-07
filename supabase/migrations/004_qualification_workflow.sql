ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS company_qualification_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS company_qualification_score REAL,
  ADD COLUMN IF NOT EXISTS company_qualification_reason TEXT,
  ADD COLUMN IF NOT EXISTS company_qualified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_qualification_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS contact_qualification_score REAL,
  ADD COLUMN IF NOT EXISTS contact_qualification_role TEXT,
  ADD COLUMN IF NOT EXISTS contact_qualification_reason TEXT,
  ADD COLUMN IF NOT EXISTS contact_qualified_at TIMESTAMPTZ;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_company_qualification_status_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_company_qualification_status_check
  CHECK (company_qualification_status IN ('pending', 'qualified', 'failed'));

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_contact_qualification_status_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_contact_qualification_status_check
  CHECK (contact_qualification_status IN ('pending', 'qualified', 'failed'));

UPDATE leads
SET
  company_qualification_status = 'pending',
  company_qualification_score = NULL,
  company_qualification_reason = NULL,
  company_qualified_at = NULL,
  contact_qualification_status = 'pending',
  contact_qualification_score = NULL,
  contact_qualification_role = NULL,
  contact_qualification_reason = NULL,
  contact_qualified_at = NULL
WHERE source_matching = 'csv_import';

UPDATE leads
SET
  company_qualification_status = 'qualified',
  company_qualification_score = COALESCE(confidence_score, 0.5),
  company_qualification_reason = 'Qualification automatique issue de la capture terrain.',
  company_qualified_at = COALESCE(created_at, now())
WHERE is_from_photo = TRUE
  AND company_qualification_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_leads_company_qualification ON leads(company_qualification_status, company_qualification_score);
CREATE INDEX IF NOT EXISTS idx_leads_contact_qualification ON leads(contact_qualification_status, contact_qualification_score);
