import { useState, useEffect } from "react";

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

const STORAGE_KEY = "menu_access_controls";

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

export function useMenuAccessControls() {
  const [config, setConfig] = useState<MenuAccessConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultConfig, ...JSON.parse(stored) } : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const updateAccess = (menu: keyof MenuAccessConfig, tier: "free" | "premium", value: boolean) => {
    setConfig(prev => ({
      ...prev,
      [menu]: { ...prev[menu], [tier]: value },
    }));
  };

  return { config, updateAccess, defaultConfig };
}

export function getMenuAccess(): MenuAccessConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaultConfig, ...JSON.parse(stored) } : defaultConfig;
  } catch {
    return defaultConfig;
  }
}
