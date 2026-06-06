import type { DataGateway, LeadDetailData, WebhookConfigInput, WebhookSettingsData } from "../../application/ports/dataGateway";
import { CaptureUploadError } from "../../application/services/importCapture";
import { LOCAL_USER_ID } from "../../domain/shared/constants";
import type { Capture, Lead, LeadWithCapture, Plan, WebhookConfig, WebhookLog } from "../../domain/shared/types";
import { supabase } from "./client";

const LEAD_WITH_CAPTURE_SELECT = "*, captures(*)";

export const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? LOCAL_USER_ID;
};

export const fetchCaptures = async () => {
  const { data, error } = await supabase.from("captures").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Capture[];
};

export const fetchLeads = async (onlyPhoto = false) => {
  let query = supabase.from("leads").select(LEAD_WITH_CAPTURE_SELECT).order("created_at", { ascending: false });
  if (onlyPhoto) query = query.eq("is_from_photo", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LeadWithCapture[];
};

export const fetchLatestPlan = async () => {
  const { data, error } = await supabase.from("plans").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data as Plan | null;
};

export const fetchLeadDetail = async (leadId: string): Promise<LeadDetailData> => {
  const [{ data: lead, error: leadError }, { data: confreres, error: confreresError }] = await Promise.all([
    supabase.from("leads").select(LEAD_WITH_CAPTURE_SELECT).eq("id", leadId).single(),
    supabase.from("leads").select(LEAD_WITH_CAPTURE_SELECT).eq("parent_lead_id", leadId).order("created_at"),
  ]);
  if (leadError) throw leadError;
  if (confreresError) throw confreresError;
  return {
    lead: lead as LeadWithCapture | null,
    confreres: (confreres ?? []) as LeadWithCapture[],
  };
};

export const updateLead = async (leadId: string, payload: Partial<Lead>) => {
  const { error } = await supabase.from("leads").update(payload).eq("id", leadId);
  if (error) throw error;
};

export const markLeadPushed = async (leadId: string) => updateLead(leadId, { pushed_at: new Date().toISOString() });

export const invokeWebhookPush = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("webhook-push", { body });
  if (error) throw error;
  return data;
};

export const invokeSearchConfreres = async (leadId: string) => {
  const { data, error } = await supabase.functions.invoke("search-confreres", { body: { lead_id: leadId } });
  if (error) throw error;
  return data as { created?: number };
};

export const invokeGeneratePlan = async () => {
  const { data, error } = await supabase.functions.invoke("generate-plan");
  if (error) throw error;
  return data;
};

export const uploadCapturePhoto = async (photo: {
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
}) => {
  const userId = await getCurrentUserId();
  const ext = photo.file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${photo.id}.${ext}`;

  const upload = await supabase.storage.from("captures").upload(path, photo.file, { upsert: false });
  if (upload.error) throw new CaptureUploadError("upload", upload.error.message);

  const { data, error } = await supabase
    .from("captures")
    .insert({
      photo_path: path,
      exif_lat: photo.exif.lat,
      exif_lng: photo.exif.lng,
      exif_taken_at: photo.exif.takenAt,
      exif_city: photo.exif.city,
      exif_departement: photo.exif.departement,
      exif_address: photo.exif.address,
      status: "pending",
      user_id: userId,
    })
    .select("id")
    .single();
  if (error) throw new CaptureUploadError("create", error.message);

  return data as { id: string };
};

export const processCapture = async (captureId: string) => {
  const { error } = await supabase.functions.invoke("process-capture", { body: { capture_id: captureId } });
  if (error) throw error;
};

export const fetchWebhookSettings = async (): Promise<WebhookSettingsData> => {
  const [{ data: configData, error: configError }, { data: logData, error: logError }] = await Promise.all([
    supabase.from("webhook_configs").select("*").order("created_at", { ascending: false }),
    supabase.from("webhook_logs").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  if (configError) throw configError;
  if (logError) throw logError;
  return {
    configs: (configData ?? []) as WebhookConfig[],
    logs: (logData ?? []) as WebhookLog[],
  };
};

export const createWebhookConfig = async (payload: WebhookConfigInput) => {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("webhook_configs").insert({ ...payload, user_id: userData.user?.id });
  if (error) throw error;
};

export const deleteWebhookConfig = async (id: string) => {
  const { error } = await supabase.from("webhook_configs").delete().eq("id", id);
  if (error) throw error;
};

export const testWebhookConfig = async (configId: string) =>
  invokeWebhookPush({ config_id: configId, test: true, trigger: "manual" });

export const supabaseDataGateway: DataGateway = {
  fetchCaptures,
  fetchLeads,
  fetchLatestPlan,
  fetchLeadDetail,
  updateLead,
  markLeadPushed,
  invokeWebhookPush,
  invokeSearchConfreres,
  invokeGeneratePlan,
  uploadCapturePhoto,
  processCapture,
  fetchWebhookSettings,
  createWebhookConfig,
  deleteWebhookConfig,
  testWebhookConfig,
};
