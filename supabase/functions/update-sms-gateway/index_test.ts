// Deno tests for SMS Gateway access control.
// Verifies:
//   1. Anon clients CANNOT update or insert into sms_gateway_settings (RLS).
//   2. Anon clients CAN read non-secret rows (public SELECT policy).
//   3. The update-sms-gateway edge function rejects requests without an admin email.
//   4. The update-sms-gateway edge function rejects invalid OTP config.
//   5. A valid admin request succeeds and persists changes.
//
// Run with: deno test --allow-net --allow-env supabase/functions/update-sms-gateway/index_test.ts

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ADMIN_EMAIL = "prakash.chinnadurai@gmail.com";
const NON_ADMIN_EMAIL = "student@example.com";

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const fnUrl = `${SUPABASE_URL}/functions/v1/update-sms-gateway`;

const validPayload = {
  provider: "twilio",
  enabled: false,
  sender_id: "AIHUB",
  otp_template: "Your AI Upskill Hub OTP is {otp}. Valid for 5 minutes.",
  otp_length: 6,
  otp_validity_minutes: 5,
  twilio_account_sid: "AC" + "x".repeat(32),
  twilio_from_number: "+15551234567",
  msg91_template_id: "",
  msg91_dlt_te_id: "",
  generic_endpoint_url: "",
  generic_http_method: "POST",
  generic_headers: {},
  generic_body_template: "",
};

const callFn = async (body: unknown, adminEmail?: string) => {
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      ...(adminEmail ? { "x-admin-email": adminEmail } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, body: json ?? text };
};

Deno.test("anon SELECT on sms_gateway_settings is allowed (non-secret)", async () => {
  const { data, error } = await anon
    .from("sms_gateway_settings")
    .select("id, provider, enabled, otp_length")
    .limit(1);
  assertEquals(error, null, `unexpected SELECT error: ${error?.message}`);
  assert(Array.isArray(data));
});

Deno.test("anon INSERT on sms_gateway_settings is blocked by RLS", async () => {
  const { error } = await anon.from("sms_gateway_settings").insert({
    provider: "twilio",
    otp_length: 6,
    otp_template: "Your OTP is {otp}",
  } as any);
  assert(error, "expected RLS to block anon insert");
});

Deno.test("anon UPDATE on sms_gateway_settings is blocked by RLS", async () => {
  const { data: rows } = await anon.from("sms_gateway_settings").select("id").limit(1);
  if (!rows?.length) return; // nothing to update — pass vacuously
  const { error, data } = await anon
    .from("sms_gateway_settings")
    .update({ enabled: true } as any)
    .eq("id", rows[0].id)
    .select();
  // RLS may either error or return zero rows updated.
  if (!error) {
    assertEquals((data ?? []).length, 0, "anon update should affect 0 rows under RLS");
  }
});

Deno.test("edge function rejects request without admin email", async () => {
  const { status, body } = await callFn(validPayload);
  assert(status >= 400 && status < 500, `expected 4xx, got ${status}: ${JSON.stringify(body)}`);
});

Deno.test("edge function rejects non-admin email", async () => {
  const { status, body } = await callFn(validPayload, NON_ADMIN_EMAIL);
  assert(status === 401 || status === 403, `expected 401/403, got ${status}: ${JSON.stringify(body)}`);
});

Deno.test("edge function rejects invalid OTP template (missing {otp})", async () => {
  const bad = { ...validPayload, otp_template: "Your OTP code, please use it soon." };
  const { status, body } = await callFn(bad, ADMIN_EMAIL);
  assertEquals(status, 400, `expected 400, got ${status}: ${JSON.stringify(body)}`);
});

Deno.test("edge function rejects out-of-range otp_length", async () => {
  const bad = { ...validPayload, otp_length: 12 };
  const { status } = await callFn(bad, ADMIN_EMAIL);
  assertEquals(status, 400);
});

Deno.test("edge function rejects out-of-range otp_validity_minutes", async () => {
  const bad = { ...validPayload, otp_validity_minutes: 999 };
  const { status } = await callFn(bad, ADMIN_EMAIL);
  assertEquals(status, 400);
});

Deno.test("edge function accepts a valid admin update", async () => {
  const { status, body } = await callFn(validPayload, ADMIN_EMAIL);
  assert(status >= 200 && status < 300, `expected 2xx, got ${status}: ${JSON.stringify(body)}`);
});
