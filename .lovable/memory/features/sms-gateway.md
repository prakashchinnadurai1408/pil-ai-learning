---
name: SMS Gateway Settings
description: Admin-only SMS gateway config (Twilio/MSG91/Generic) under LLM Settings page; store-only, OTP login still uses hardcoded '1234'
type: feature
---
- Table: `sms_gateway_settings` (single row) stores provider choice, sender ID, OTP template/length/validity, and per-provider non-secret fields.
- Providers supported: Twilio (Account SID + From Number), MSG91 (Template ID + DLT TE ID), Generic HTTP (URL/method/headers JSON/body template).
- Secret API keys (TWILIO_AUTH_TOKEN, MSG91_AUTH_KEY, SMS_GENERIC_AUTH_KEY) live only in backend Secrets — table only tracks `*_set` flags.
- UI: `SMSGatewaySettings.tsx` rendered inside `LLMSettings.tsx` (Admin → System → LLM Settings). Admin-only.
- Mode: store-only. Login flow still uses hardcoded OTP `1234` until an edge function is wired to send real OTPs via the chosen provider.
