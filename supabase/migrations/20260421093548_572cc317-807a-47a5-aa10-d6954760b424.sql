CREATE TABLE public.sms_gateway_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'twilio',
  enabled boolean NOT NULL DEFAULT false,
  sender_id text NOT NULL DEFAULT '',
  otp_template text NOT NULL DEFAULT 'Your AI Upskill Hub OTP is {otp}. Valid for 5 minutes.',
  otp_length integer NOT NULL DEFAULT 6,
  otp_validity_minutes integer NOT NULL DEFAULT 5,
  twilio_account_sid text NOT NULL DEFAULT '',
  twilio_from_number text NOT NULL DEFAULT '',
  msg91_auth_key_set boolean NOT NULL DEFAULT false,
  msg91_template_id text NOT NULL DEFAULT '',
  msg91_dlt_te_id text NOT NULL DEFAULT '',
  generic_endpoint_url text NOT NULL DEFAULT '',
  generic_http_method text NOT NULL DEFAULT 'POST',
  generic_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  generic_body_template text NOT NULL DEFAULT '',
  generic_auth_key_set boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'admin'
);

ALTER TABLE public.sms_gateway_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sms gateway settings" ON public.sms_gateway_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sms gateway settings" ON public.sms_gateway_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sms gateway settings" ON public.sms_gateway_settings FOR UPDATE USING (true) WITH CHECK (true);

INSERT INTO public.sms_gateway_settings (provider) VALUES ('twilio');