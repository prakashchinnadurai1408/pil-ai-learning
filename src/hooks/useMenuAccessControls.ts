import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MenuAccessConfig {
  modules: { free: boolean; premium: boolean };
  videos: { free: boolean; premium: boolean };
  playground: { free: boolean; premium: boolean };
  coding: { free: boolean; premium: boolean };
  prompts: { free: boolean; premium: boolean };
  tools: { free: boolean; premium: boolean };
  assessments: { free: boolean; premium: boolean };
  projects: { free: boolean; premium: boolean };
}

const defaultConfig: MenuAccessConfig = {
  modules: { free: true, premium: true },
  videos: { free: true, premium: true },
  playground: { free: true, premium: true },
  coding: { free: true, premium: true },
  prompts: { free: true, premium: true },
  tools: { free: false, premium: true },
  assessments: { free: true, premium: true },
  projects: { free: false, premium: true },
};

export const menuLabels: Record<keyof MenuAccessConfig, string> = {
  modules: "Modules",
  videos: "Videos",
  playground: "AI Chat",
  coding: "Coding",
  prompts: "Prompts",
  tools: "AI Tools Sandbox",
  assessments: "Assessments",
  projects: "Projects",
};

function dbRowsToConfig(rows: { menu_key: string; free_access: boolean; premium_access: boolean }[]): MenuAccessConfig {
  const config = { ...defaultConfig };
  for (const row of rows) {
    const key = row.menu_key as keyof MenuAccessConfig;
    if (key in config) {
      config[key] = { free: row.free_access, premium: row.premium_access };
    }
  }
  return config;
}

export function useMenuAccessControls() {
  const [config, setConfig] = useState<MenuAccessConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("menu_access_controls")
        .select("menu_key, free_access, premium_access");
      if (data && data.length > 0) {
        setConfig(dbRowsToConfig(data));
      }
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const updateAccess = useCallback(async (menu: keyof MenuAccessConfig, tier: "free" | "premium", value: boolean) => {
    setConfig(prev => ({
      ...prev,
      [menu]: { ...prev[menu], [tier]: value },
    }));

    const updateField = tier === "free" ? { free_access: value } : { premium_access: value };
    const { error } = await supabase
      .from("menu_access_controls")
      .update({ ...updateField, updated_at: new Date().toISOString() })
      .eq("menu_key", menu);

    if (error) {
      toast.error("Failed to save access control");
    }
  }, []);

  return { config, updateAccess, loading, defaultConfig };
}

export async function getMenuAccess(): Promise<MenuAccessConfig> {
  const { data } = await supabase
    .from("menu_access_controls")
    .select("menu_key, free_access, premium_access");
  if (data && data.length > 0) {
    return dbRowsToConfig(data);
  }
  return defaultConfig;
}
