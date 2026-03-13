import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminModule {
  id: number;
  title: string;
  description: string;
  icon_name: string;
  color: string;
  duration: string;
  status: string;
  created_at: string;
  topics: AdminModuleTopic[];
}

export interface AdminModuleTopic {
  id: string;
  module_id: number;
  title: string;
  description: string;
  suggested_videos: string[];
  sort_order: number;
}

export function useAdminModules() {
  const [adminModules, setAdminModules] = useState<AdminModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = async () => {
    setLoading(true);
    const { data: mods } = await supabase
      .from("admin_modules")
      .select("*")
      .order("created_at", { ascending: true });

    const { data: topics } = await supabase
      .from("admin_module_topics")
      .select("*")
      .order("sort_order", { ascending: true });

    const mapped: AdminModule[] = (mods || []).map((m: any) => ({
      ...m,
      topics: (topics || []).filter((t: any) => t.module_id === m.id),
    }));

    setAdminModules(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchModules();
  }, []);

  return { adminModules, loading, refetch: fetchModules };
}
