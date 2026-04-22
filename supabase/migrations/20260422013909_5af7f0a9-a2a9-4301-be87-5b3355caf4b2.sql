-- Tighten SELECT on sms_gateway_settings: hide all provider config from anon.
-- Expose only non-sensitive OTP UX fields via a dedicated view.

DROP POLICY IF EXISTS "Public can read sms gateway settings (non-secret)" ON public.sms_gateway_settings;

-- No public SELECT policy = anon/authenticated cannot read the base table.
-- service_role bypasses RLS, so the edge function (and admin tooling) still works.

-- Public-safe view: only fields the login screen legitimately needs.
CREATE OR REPLACE VIEW public.sms_gateway_public AS
SELECT
  enabled,
  otp_length,
  otp_validity_minutes
FROM public.sms_gateway_settings;

-- Views inherit invoker rights; grant explicit read to anon/authenticated.
GRANT SELECT ON public.sms_gateway_public TO anon, authenticated;