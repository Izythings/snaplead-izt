import { useCallback, useEffect, useState } from "react";
import type { Plan } from "../domain/shared/types";
import { supabaseDataGateway } from "../infrastructure/supabase/repository";

export const usePlan = () => {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlan(await supabaseDataGateway.fetchLatestPlan());
    } catch {
      setPlan(null);
    }
    setLoading(false);
  }, []);

  const generate = async () => {
    const data = await supabaseDataGateway.invokeGeneratePlan();
    await load();
    return data;
  };

  useEffect(() => {
    load();
  }, [load]);

  return { plan, loading, generate, reload: load };
};
