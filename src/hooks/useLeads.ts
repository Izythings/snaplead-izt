import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { LeadWithCapture } from "../lib/types";

export const useLeads = (onlyPhoto = false) => {
  const [leads, setLeads] = useState<LeadWithCapture[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("leads")
      .select("*, captures(*)")
      .order("created_at", { ascending: false });
    if (onlyPhoto) query = query.eq("is_from_photo", true);
    const { data, error } = await query;
    if (!error) setLeads((data ?? []) as LeadWithCapture[]);
    setLoading(false);
  }, [onlyPhoto]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { leads, loading, reload: load };
};
