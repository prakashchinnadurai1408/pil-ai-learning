-- Tighten RLS on sms_gateway_settings: anon can read, but only service role can modify.
-- Writes will be routed through the update-sms-gateway edge function which validates admin + input.

DROP POLICY IF EXISTS "Anyone can insert sms gateway settings" ON public.sms_gateway_settings;
DROP POLICY IF EXISTS "Anyone can update sms gateway settings" ON public.sms_gateway_settings;
DROP POLICY IF EXISTS "Anyone can read sms gateway settings" ON public.sms_gateway_settings;

-- Reads: allow public so admin UI can display current config (no secrets are stored in this table)
CREATE POLICY "Public can read sms gateway settings (non-secret)"
ON public.sms_gateway_settings
FOR SELECT
USING (true);

-- Writes: only service_role (edge function) — anon/authenticated cannot insert/update directly
CREATE POLICY "Service role can insert sms gateway settings"
ON public.sms_gateway_settings
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update sms gateway settings"
ON public.sms_gateway_settings
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
