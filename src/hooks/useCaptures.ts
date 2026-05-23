import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Capture } from "../lib/types";

export const useCaptures = () => {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("captures").select("*").order("created_at", { ascending: false });
    if (!error) setCaptures((data ?? []) as Capture[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("captures-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "captures" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { captures, loading, reload: load };
};
