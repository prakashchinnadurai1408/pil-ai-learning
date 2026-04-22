import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "moderator" | "user" | null;

/**
 * Returns the current authenticated user's highest role.
 * - `admin`: full write access (approve trainers, publish/rollback MCQs)
 * - `moderator`: coordinator — read-only / progress viewing
 * - `null`: not signed in or no role
 *
 * Convenience flags `isAdmin` / `isCoordinator` are used across admin UIs to
 * gate destructive or workflow-changing actions.
 */
export function useUserRole() {
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session?.user) { setRole(null); setLoading(false); return; }
      const [adminRes, modRes] = await Promise.all([
        supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: session.user.id, _role: "moderator" }),
      ]);
      if (!active) return;
      if (adminRes.data) setRole("admin");
      else if (modRes.data) setRole("moderator");
      else setRole("user");
      setLoading(false);
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return {
    role,
    loading,
    isAdmin: role === "admin",
    isCoordinator: role === "moderator",
    canManage: role === "admin",
  };
}
