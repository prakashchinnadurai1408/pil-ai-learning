import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Tier = "free" | "beginner" | "advanced" | "enterprise";
export type Audience = "student" | "trainer";

export const TIERS: Tier[] = ["free", "beginner", "advanced", "enterprise"];

export const TIER_META: Record<Tier, { label: string; price: string; tagline: string; color: string }> = {
  free:       { label: "Free",       price: "₹0",            tagline: "Start exploring AI",                color: "text-muted-foreground" },
  beginner:   { label: "Beginner",   price: "₹299/mo",       tagline: "For learners building basics",      color: "text-primary" },
  advanced:   { label: "Advanced",   price: "₹599/mo",       tagline: "For serious upskillers",            color: "text-accent" },
  enterprise: { label: "Enterprise", price: "₹1,499/mo",     tagline: "For colleges & teams",              color: "text-warning" },
};

export interface MenuRow {
  menu_key: string;
  audience: Audience;
  label: string;
  sort_order: number;
  free: boolean;
  beginner: boolean;
  advanced: boolean;
  enterprise: boolean;
}

export type MenuAccessConfig = Record<string, Record<Tier, boolean>>;

const STUDENT_LABELS: Record<string, string> = {
  overview: "Overview",
  subscription: "Subscriptions Status",
  ai_path: "Learning Paths",
  module_groups: "Module Groups",
  modules: "Modules & Videos",
  playground: "Section Content – AI Chat",
  tools: "Section Content – AI Tools",
  question_bank: "Question Bank",
  coding: "Coding Challenges",
  prompts: "Prompts",
  assessments: "Assessments",
  projects: "Projects",
  analytics_assessments: "Analytics — Assessments",
  analytics_proctoring: "Analytics — Proctoring",
  analytics_projects: "Analytics — Projects",
  notifications: "Notifications",
  profile: "Profile",
};
const TRAINER_LABELS: Record<string, string> = {
  students: "Student Progress", assessments_overview: "Assessment Overview",
  create_assessment: "Create Assessment", assessment_analytics: "Assessment Analytics",
  module_analytics: "Module Analytics", coding_analytics: "Coding Analytics",
  project_reviews: "Project Reviews", bulk_messaging: "Bulk Messaging",
};

export const menuLabels = (audience: Audience): Record<string, string> =>
  audience === "trainer" ? TRAINER_LABELS : STUDENT_LABELS;

function rowToMenuRow(r: any): MenuRow {
  return {
    menu_key: r.menu_key,
    audience: (r.audience ?? "student") as Audience,
    label: r.label || (r.audience === "trainer" ? TRAINER_LABELS[r.menu_key] : STUDENT_LABELS[r.menu_key]) || r.menu_key,
    sort_order: r.sort_order ?? 0,
    free: !!r.free_access,
    beginner: r.beginner_access ?? r.free_access,
    advanced: r.advanced_access ?? r.premium_access ?? true,
    enterprise: r.enterprise_access ?? true,
  };
}

export async function fetchMenuRows(audience?: Audience): Promise<MenuRow[]> {
  let query = supabase.from("menu_access_controls" as any).select("*");
  if (audience) query = query.eq("audience", audience);
  const { data } = await query;
  return ((data as any[]) || []).map(rowToMenuRow).sort((a, b) => a.sort_order - b.sort_order);
}

export function rowsToConfig(rows: MenuRow[]): MenuAccessConfig {
  const cfg: MenuAccessConfig = {};
  for (const r of rows) {
    cfg[r.menu_key] = { free: r.free, beginner: r.beginner, advanced: r.advanced, enterprise: r.enterprise };
  }
  return cfg;
}

export async function getMenuAccess(audience: Audience = "student"): Promise<MenuAccessConfig> {
  const rows = await fetchMenuRows(audience);
  return rowsToConfig(rows);
}

export function isAllowed(cfg: MenuAccessConfig, key: string, tier: Tier): boolean {
  const entry = cfg[key];
  if (!entry) return true; // unknown key → allow (don't break dashboards)
  return entry[tier] !== false;
}

export function useMenuAccessControls(audience: Audience = "student") {
  const [rows, setRows] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenuRows(audience).then((r) => { setRows(r); setLoading(false); });
  }, [audience]);

  const updateAccess = useCallback(async (menu_key: string, tier: Tier, value: boolean) => {
    setRows(prev => prev.map(r => r.menu_key === menu_key ? { ...r, [tier]: value } : r));
    const field =
      tier === "free" ? { free_access: value } :
      tier === "beginner" ? { beginner_access: value } :
      tier === "advanced" ? { advanced_access: value, premium_access: value } : // keep legacy column in sync
      { enterprise_access: value };
    const { error } = await supabase
      .from("menu_access_controls" as any)
      .update({ ...field, updated_at: new Date().toISOString() })
      .eq("audience", audience)
      .eq("menu_key", menu_key);
    if (error) toast.error("Failed to save access control");
  }, [audience]);

  return { rows, loading, updateAccess };
}
