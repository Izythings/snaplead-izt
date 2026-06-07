import type { Capture, Lead, LeadWithCapture, Plan, WebhookConfig, WebhookLog, WebhookTrigger } from "../../domain/shared/types";

export type LeadDetailData = {
  lead: LeadWithCapture | null;
  confreres: LeadWithCapture[];
  contacts: LeadWithCapture[];
};

export type WebhookSettingsData = {
  configs: WebhookConfig[];
  logs: WebhookLog[];
};

export type CaptureUploadInput = {
  id: string;
  file: File;
  exif: {
    lat: number | null;
    lng: number | null;
    takenAt: string | null;
    city: string | null;
    departement: string | null;
    address: string | null;
  };
};

export type WebhookConfigInput = {
  name: string;
  url: string;
  headers: Record<string, string>;
  trigger_on: WebhookTrigger;
  field_mapping: Record<string, string>;
};

export type DataGateway = {
  fetchCaptures(): Promise<Capture[]>;
  fetchLeads(onlyPhoto?: boolean): Promise<LeadWithCapture[]>;
  fetchLatestPlan(): Promise<Plan | null>;
  fetchLeadDetail(leadId: string): Promise<LeadDetailData>;
  updateLead(leadId: string, payload: Partial<Lead>): Promise<void>;
  importLeads(payload: Array<Partial<Lead> & { import_key: string }>): Promise<{ imported: number }>;
  markLeadPushed(leadId: string): Promise<void>;
  invokeWebhookPush(body: Record<string, unknown>): Promise<unknown>;
  invokeSearchConfreres(leadId: string): Promise<{ created?: number }>;
  invokeQualifyLeads(leadIds: string[], scope: "lead" | "contacts" | "both"): Promise<{ qualified?: number }>;
  invokeGeneratePlan(): Promise<unknown>;
  uploadCapturePhoto(photo: CaptureUploadInput): Promise<{ id: string }>;
  processCapture(captureId: string): Promise<void>;
  fetchWebhookSettings(): Promise<WebhookSettingsData>;
  createWebhookConfig(payload: WebhookConfigInput): Promise<void>;
  deleteWebhookConfig(id: string): Promise<void>;
  testWebhookConfig(configId: string): Promise<unknown>;
};
