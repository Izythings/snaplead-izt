import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Plan } from "../lib/types";

export const usePlan = () => {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("plans").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!error) setPlan(data as Plan | null);
    setLoading(false);
  }, []);

  const generate = async () => {
    const { data, error } = await supabase.functions.invoke("generate-plan");
    if (error) throw error;
    await load();
    return data;
  };

  useEffect(() => {
    load();
  }, [load]);

  return { plan, loading, generate, reload: load };
};
