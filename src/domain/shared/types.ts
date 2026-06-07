export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CaptureStatus = "pending" | "processing" | "done" | "failed";
export type LeadStatus = "identified" | "enriched" | "actionable" | "contacted" | "archived";
export type QualificationStatus = "pending" | "qualified" | "failed";
export type DigitalSegment = "mature_visible" | "gbp_sans_site" | "invisible" | "inconnu";
export type SuggestedOffer = "crm" | "package_site_crm" | "crm_low_prio" | "manuel";
export type CampaignStatus =
  | "not_started"
  | "ready"
  | "queued"
  | "sent"
  | "follow_up_1"
  | "follow_up_2"
  | "replied"
  | "completed"
  | "failed"
  | "stopped";
export type WebhookTrigger = "manual" | "on_enriched" | "on_actionable" | "on_contacted";

export type Capture = {
  id: string;
  created_at: string;
  photo_path: string;
  photo_url: string | null;
  exif_lat: number | null;
  exif_lng: number | null;
  exif_taken_at: string | null;
  exif_city: string | null;
  exif_departement: string | null;
  exif_address: string | null;
  status: CaptureStatus;
  extracted_data: Json | null;
  error_message: string | null;
  processed_at: string | null;
  user_id: string;
};

export type Lead = {
  id: string;
  capture_id: string | null;
  created_at: string;
  nom_commercial: string | null;
  telephone: string | null;
  site_web: string | null;
  email: string | null;
  activite: string | null;
  ville: string | null;
  adresse: string | null;
  raison_sociale: string | null;
  siren: string | null;
  siret: string | null;
  code_naf: string | null;
  libelle_naf: string | null;
  date_creation: string | null;
  dirigeant: string | null;
  effectif: string | null;
  tranche_effectif_code: string | null;
  chiffre_affaires: string | null;
  adresse_siege: string | null;
  departement: string | null;
  confidence_score: number | null;
  source_matching: string | null;
  resume_business: string | null;
  angle_approche: string | null;
  script_appel: string | null;
  email_prospection: string | null;
  status: LeadStatus;
  notes: string | null;
  pushed_at: string | null;
  is_from_photo: boolean;
  parent_lead_id: string | null;
  import_key: string | null;
  source_external_id: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_job_title: string | null;
  contact_linkedin: string | null;
  company_linkedin: string | null;
  campaign_status: CampaignStatus;
  campaign_started_at: string | null;
  campaign_last_event_at: string | null;
  campaign_replied_at: string | null;
  campaign_error: string | null;
  campaign_execution_id: string | null;
  company_qualification_status: QualificationStatus;
  company_qualification_score: number | null;
  company_qualification_reason: string | null;
  company_qualified_at: string | null;
  contact_qualification_status: QualificationStatus;
  contact_qualification_score: number | null;
  contact_qualification_role: string | null;
  contact_qualification_reason: string | null;
  contact_qualified_at: string | null;
  website_url: string | null;
  has_website: boolean | null;
  gbp_place_id: string | null;
  gbp_rating: number | null;
  gbp_review_count: number | null;
  gbp_business_status: string | null;
  gbp_maps_url: string | null;
  digital_segment: DigitalSegment | null;
  suggested_offer: SuggestedOffer | null;
  digital_checked_at: string | null;
  user_id: string;
};

export type LeadWithCapture = Lead & { captures?: Capture | null };

export type PlanGroup = {
  metier: string;
  zone: string;
  contexte: string;
  lead_principal: { lead_id: string; nom: string; angle: string; script_appel: string; email: string };
  confreres: Array<{ lead_id: string; nom: string; accroche: string; script_appel: string }>;
  ordre_recommande: string[];
};

export type AttackPlan = {
  date: string;
  groupes: PlanGroup[];
  resume_journee: string;
};

export type Plan = {
  id: string;
  created_at: string;
  date_cible: string;
  contenu: AttackPlan | null;
  lead_ids: string[];
  status: "draft" | "ready" | "done";
  user_id: string;
};

export type WebhookConfig = {
  id: string;
  created_at: string;
  name: string;
  url: string;
  headers: Record<string, string>;
  trigger_on: WebhookTrigger;
  field_mapping: Record<string, keyof Lead | string>;
  is_active: boolean;
  user_id: string;
};

export type WebhookLog = {
  id: string;
  created_at: string;
  webhook_config_id: string | null;
  lead_id: string | null;
  request_payload: Json | null;
  response_status: number | null;
  response_body: string | null;
  success: boolean;
  user_id: string;
};
