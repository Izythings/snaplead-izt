import { useCallback } from "react";
import type { LeadWithCapture } from "../domain/shared/types";
import { supabaseDataGateway } from "../infrastructure/supabase/repository";
import { useRealtimeResource } from "../presentation/hooks/useRealtimeResource";

export const useLeads = (onlyPhoto = false) => {
  const loadLeads = useCallback(() => supabaseDataGateway.fetchLeads(onlyPhoto), [onlyPhoto]);
  const { data, loading, reload } = useRealtimeResource<LeadWithCapture[]>(loadLeads, "leads-realtime", "leads");

  return { leads: data ?? [], loading, reload };
};
