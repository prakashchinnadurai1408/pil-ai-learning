ALTER VIEW public.sms_gateway_public SET (security_invoker = true);

-- The view reads from sms_gateway_settings, which now has no public SELECT policy.
-- security_invoker means the view executes as the caller, so we need a narrow
-- SELECT policy that allows reading ONLY the fields exposed by the view.
-- Postgres RLS is row-level (not column-level), so we add a SELECT policy back
-- and rely on the view to project only safe columns. To prevent direct table reads
-- from leaking sensitive columns, we revoke column privileges on sensitive ones.

CREATE POLICY "Public can read sms gateway row for view"
ON public.sms_gateway_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Revoke broad table SELECT from anon/authenticated, then grant only safe columns.
REVOKE SELECT ON public.sms_gateway_settings FROM anon, authenticated;
GRANT SELECT (enabled, otp_length, otp_validity_minutes, provider)
  ON public.sms_gateway_settings TO anon, authenticated;