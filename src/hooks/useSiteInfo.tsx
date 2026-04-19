import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteInfoMap = Record<string, Record<string, string>>; // section -> key -> value

let cache: SiteInfoMap | null = null;
const listeners = new Set<(s: SiteInfoMap) => void>();

async function load(): Promise<SiteInfoMap> {
  const { data } = await supabase.from("site_info").select("section, key, value");
  const map: SiteInfoMap = {};
  for (const row of data ?? []) {
    if (!map[row.section]) map[row.section] = {};
    map[row.section][row.key] = row.value ?? "";
  }
  cache = map;
  listeners.forEach((l) => l(map));
  return map;
}

export function useSiteInfo() {
  const [info, setInfo] = useState<SiteInfoMap>(cache ?? {});

  useEffect(() => {
    listeners.add(setInfo);
    if (!cache) load();
    return () => {
      listeners.delete(setInfo);
    };
  }, []);

  return {
    info,
    get: (section: string, key: string, fallback = "") =>
      info[section]?.[key] ?? fallback,
    refresh: load,
  };
}

export function refreshSiteInfo() {
  return load();
}
