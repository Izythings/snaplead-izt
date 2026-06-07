ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS import_key TEXT,
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS contact_first_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_last_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_job_title TEXT,
  ADD COLUMN IF NOT EXISTS contact_linkedin TEXT,
  ADD COLUMN IF NOT EXISTS company_linkedin TEXT,
  ADD COLUMN IF NOT EXISTS campaign_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS campaign_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS campaign_last_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS campaign_replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS campaign_error TEXT,
  ADD COLUMN IF NOT EXISTS campaign_execution_id TEXT;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_campaign_status_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_campaign_status_check
  CHECK (
    campaign_status IN (
      'not_started',
      'ready',
      'queued',
      'sent',
      'follow_up_1',
      'follow_up_2',
      'replied',
      'completed',
      'failed',
      'stopped'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_user_import_key
  ON leads(user_id, import_key);

CREATE INDEX IF NOT EXISTS idx_leads_campaign_status ON leads(campaign_status);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_event ON leads(campaign_last_event_at DESC);
