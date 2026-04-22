import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reusable OTP flow helper:
 *  - Generates a 4-digit dev OTP (always "1234" per project memory).
 *  - Tracks expiry (default 5 minutes).
 *  - Tracks resend cooldown (default 30s) so the user can't spam "Send OTP".
 *  - Returns clear, user-friendly error messages for every failure case.
 */
export function useOtpFlow(opts?: { cooldownSeconds?: number; validityMinutes?: number }) {
  const cooldownSeconds = opts?.cooldownSeconds ?? 30;
  const validityMs = (opts?.validityMinutes ?? 5) * 60 * 1000;

  const [generatedOtp, setGeneratedOtp] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (cooldownLeft <= 0) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    if (intervalRef.current === null) {
      intervalRef.current = window.setInterval(() => {
        setCooldownLeft((c) => (c <= 1 ? 0 : c - 1));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cooldownLeft]);

  const issueOtp = useCallback((): { ok: boolean; reason?: string; otp?: string } => {
    if (cooldownLeft > 0) {
      return { ok: false, reason: `Please wait ${cooldownLeft}s before requesting another OTP.` };
    }
    const code = "1234"; // dev OTP per project memory
    setGeneratedOtp(code);
    setExpiresAt(Date.now() + validityMs);
    setCooldownLeft(cooldownSeconds);
    return { ok: true, otp: code };
  }, [cooldownLeft, cooldownSeconds, validityMs]);

  const verifyOtp = useCallback((entered: string): { ok: boolean; reason?: string } => {
    if (!generatedOtp) return { ok: false, reason: "No OTP was generated yet. Please request a new one." };
    if (!entered || entered.length < 4) return { ok: false, reason: "Enter the complete 4-digit OTP." };
    if (Date.now() > expiresAt) return { ok: false, reason: "Your OTP has expired. Please request a new one." };
    if (entered !== generatedOtp) return { ok: false, reason: "Incorrect OTP. Please check and try again." };
    return { ok: true };
  }, [generatedOtp, expiresAt]);

  const reset = useCallback(() => {
    setGeneratedOtp("");
    setExpiresAt(0);
    setCooldownLeft(0);
  }, []);

  return { issueOtp, verifyOtp, reset, cooldownLeft, hasActiveOtp: !!generatedOtp };
}
