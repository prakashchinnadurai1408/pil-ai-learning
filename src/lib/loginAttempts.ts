import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight, fire-and-forget logger for login + OTP activity.
 * Never throws — failures here must never block a login flow.
 */
export type LoginAttemptInput = {
  audience: "student" | "trainer" | "admin";
  identifier: string;
  identifierType?: "mobile" | "email";
  userId?: string | null;
  userName?: string;
  stage: "password" | "otp_issued" | "otp_verified" | "login_success";
  status: "success" | "failure";
  reason?: string;
};

export async function logLoginAttempt(input: LoginAttemptInput) {
  try {
    await supabase.from("login_attempts").insert({
      audience: input.audience,
      identifier: input.identifier ?? "",
      identifier_type: input.identifierType ?? (input.audience === "admin" ? "email" : "mobile"),
      user_id: input.userId ?? null,
      user_name: input.userName ?? "",
      stage: input.stage,
      status: input.status,
      reason: input.reason ?? "",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 255) : "",
    });
  } catch (err) {
    // Logging must never break the login flow.
    console.warn("[loginAttempts] log failed:", err);
  }
}
