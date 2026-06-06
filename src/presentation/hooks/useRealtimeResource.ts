import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../infrastructure/supabase/client";

export const useRealtimeResource = <T>(loadResource: () => Promise<T>, channelName?: string, table?: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadResource());
      setError(null);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [loadResource]);

  useEffect(() => {
    void load();
    if (!channelName || !table) return undefined;

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => void load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, load, table]);

  return { data, loading, error, reload: load };
};
