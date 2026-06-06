import { useCallback } from "react";
import type { Capture } from "../domain/shared/types";
import { supabaseDataGateway } from "../infrastructure/supabase/repository";
import { useRealtimeResource } from "../presentation/hooks/useRealtimeResource";

export const useCaptures = () => {
  const loadCaptures = useCallback(() => supabaseDataGateway.fetchCaptures(), []);
  const { data, loading, reload } = useRealtimeResource<Capture[]>(loadCaptures, "captures-realtime", "captures");

  return { captures: data ?? [], loading, reload };
};
