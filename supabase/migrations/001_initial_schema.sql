CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  photo_path TEXT NOT NULL,
  photo_url TEXT,
  exif_lat DOUBLE PRECISION,
  exif_lng DOUBLE PRECISION,
  exif_taken_at TIMESTAMPTZ,
  exif_city TEXT,
  exif_departement TEXT,
  exif_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  extracted_data JSONB,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  user_id UUID NOT NULL DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id UUID REFERENCES captures(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nom_commercial TEXT,
  telephone TEXT,
  site_web TEXT,
  email TEXT,
  activite TEXT,
  ville TEXT,
  adresse TEXT,
  raison_sociale TEXT,
  siren TEXT,
  siret TEXT,
  code_naf TEXT,
  libelle_naf TEXT,
  date_creation TEXT,
  dirigeant TEXT,
  effectif TEXT,
  tranche_effectif_code TEXT,
  chiffre_affaires TEXT,
  adresse_siege TEXT,
  departement TEXT,
  confidence_score REAL,
  source_matching TEXT,
  resume_business TEXT,
  angle_approche TEXT,
  script_appel TEXT,
  email_prospection TEXT,
  status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified','enriched','actionable','contacted','archived')),
  notes TEXT,
  pushed_at TIMESTAMPTZ,
  is_from_photo BOOLEAN NOT NULL DEFAULT TRUE,
  parent_lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_cible DATE NOT NULL DEFAULT CURRENT_DATE + 1,
  contenu JSONB,
  lead_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','done')),
  user_id UUID NOT NULL DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  headers JSONB DEFAULT '{}',
  trigger_on TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_on IN ('manual','on_enriched','on_actionable','on_contacted')),
  field_mapping JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  user_id UUID NOT NULL DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
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

ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own" ON captures;
DROP POLICY IF EXISTS "own" ON leads;
DROP POLICY IF EXISTS "own" ON plans;
DROP POLICY IF EXISTS "own" ON webhook_configs;
DROP POLICY IF EXISTS "own" ON webhook_logs;

CREATE POLICY "own" ON captures FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own" ON leads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own" ON plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own" ON webhook_configs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own" ON webhook_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('captures', 'captures', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "upload" ON storage.objects;
DROP POLICY IF EXISTS "read" ON storage.objects;
DROP POLICY IF EXISTS "update" ON storage.objects;
DROP POLICY IF EXISTS "delete" ON storage.objects;

CREATE POLICY "upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'captures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "read" ON storage.objects
FOR SELECT USING (bucket_id = 'captures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "update" ON storage.objects
FOR UPDATE USING (bucket_id = 'captures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "delete" ON storage.objects
FOR DELETE USING (bucket_id = 'captures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE INDEX IF NOT EXISTS idx_leads_naf ON leads(code_naf);
CREATE INDEX IF NOT EXISTS idx_leads_dept ON leads(departement);
CREATE INDEX IF NOT EXISTS idx_leads_capture ON leads(capture_id);
CREATE INDEX IF NOT EXISTS idx_leads_parent ON leads(parent_lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_captures_status ON captures(status);
CREATE INDEX IF NOT EXISTS idx_captures_date ON captures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_date ON webhook_logs(created_at DESC);
