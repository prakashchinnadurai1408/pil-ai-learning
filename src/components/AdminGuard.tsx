import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingFallback } from "@/components/LoadingFallback";

/**
 * Guards admin-only routes. Requires:
 *  1. A valid Supabase Auth session.
 *  2. The current user has the 'admin' role in user_roles (verified via has_role()).
 *
 * Anyone else is redirected back to /admin-login.
 */
export const AdminGuard = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session?.user) {
        setState("denied");
        return;
      }
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!active) return;
      setState(error || !data ? "denied" : "ok");
    };
    check();

    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === "checking") return <LoadingFallback />;
  if (state === "denied") return <Navigate to="/admin-login" replace />;
  return <>{children}</>;
};
