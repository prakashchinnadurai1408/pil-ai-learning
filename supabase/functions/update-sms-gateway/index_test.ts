// Deno tests for SMS Gateway access control.
//
// Verifies the security boundary around sms_gateway_settings:
//
//  Anon clients:
//    1. CAN read only the four non-sensitive columns (provider, enabled,
//       otp_length, otp_validity_minutes). Selecting `*` or any sensitive
//       column (Twilio SID, Twilio From number, MSG91 IDs, generic
//       endpoint URL, headers, body template, sender ID, OTP template)
//       MUST be rejected by Postgres column privileges.
//    2. CANNOT INSERT or UPDATE the table (RLS blocks writes).
//    3. CAN read the same four safe columns through `sms_gateway_public`
//       view, which is the public surface intended for the login screen.
//
//  Edge function `update-sms-gateway`:
//    4. Rejects requests without an admin email header.
//    5. Rejects requests with a non-admin email header.
//    6. Rejects invalid OTP template (missing {otp}), out-of-range otp_length,
//       and out-of-range otp_validity_minutes.
//    7. Accepts a valid admin GET (returns the full row, secrets included)
//       and a valid admin POST (persists the change).
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

// Columns that must NEVER be readable by anon/authenticated users.
const SENSITIVE_COLUMNS = [
  "twilio_account_sid",
  "twilio_from_number",
  "msg91_template_id",
  "msg91_dlt_te_id",
  "msg91_auth_key_set",
  "generic_endpoint_url",
  "generic_http_method",
  "generic_headers",
  "generic_body_template",
  "generic_auth_key_set",
  "sender_id",
  "otp_template",
  "updated_by",
  "updated_at",
  "id",
];

// Columns that ARE safe for anon to read (login screen needs these).
const SAFE_COLUMNS = ["provider", "enabled", "otp_length", "otp_validity_minutes"];

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

const callFn = async (
  body: unknown,
  adminEmail?: string,
  method: "GET" | "POST" = "POST",
) => {
  const res = await fetch(fnUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      ...(adminEmail ? { "x-admin-email": adminEmail } : {}),
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, body: json ?? text };
};

// ---------- Anon read surface ----------

Deno.test("anon SELECT on safe columns succeeds", async () => {
  const { data, error } = await anon
    .from("sms_gateway_settings")
    .select(SAFE_COLUMNS.join(","))
    .limit(1);
  assertEquals(error, null, `unexpected error reading safe columns: ${error?.message}`);
  assert(Array.isArray(data));
});

Deno.test("anon SELECT * is blocked (would expose sensitive columns)", async () => {
  const { error } = await anon.from("sms_gateway_settings").select("*").limit(1);
  assert(
    error,
    "anon select(*) must fail because column privileges hide sensitive fields",
  );
});

for (const col of SENSITIVE_COLUMNS) {
  Deno.test(`anon SELECT of sensitive column "${col}" is blocked`, async () => {
    const { error } = await anon
      .from("sms_gateway_settings")
      .select(col)
      .limit(1);
    assert(
      error,
      `anon must NOT be able to read sensitive column "${col}"`,
    );
  });
}

Deno.test("anon can read sms_gateway_public view (only safe fields)", async () => {
  const { data, error } = await anon
    .from("sms_gateway_public" as any)
    .select("enabled, otp_length, otp_validity_minutes")
    .limit(1);
  assertEquals(error, null, `view should be readable by anon: ${error?.message}`);
  assert(Array.isArray(data));
});

// ---------- Anon write surface ----------

Deno.test("anon INSERT on sms_gateway_settings is blocked", async () => {
  const { error } = await anon.from("sms_gateway_settings").insert({
    provider: "twilio",
    otp_length: 6,
    otp_template: "Your OTP is {otp}",
  } as any);
  assert(error, "expected RLS / privileges to block anon insert");
});

Deno.test("anon UPDATE on sms_gateway_settings is blocked", async () => {
  // We cannot select id (sensitive), so try a blind update by provider.
  const { error, data } = await anon
    .from("sms_gateway_settings")
    .update({ enabled: true } as any)
    .eq("provider", "twilio")
    .select("provider");
  if (!error) {
    assertEquals(
      (data ?? []).length,
      0,
      "anon update should affect 0 rows (RLS) or be rejected outright",
    );
  }
});

// ---------- Edge function admin gate ----------

Deno.test("edge function rejects request without admin email", async () => {
  const { status } = await callFn(validPayload);
  assertEquals(status, 401);
});

Deno.test("edge function rejects non-admin email", async () => {
  const { status } = await callFn(validPayload, NON_ADMIN_EMAIL);
  assertEquals(status, 401);
});

Deno.test("edge function GET rejects non-admin", async () => {
  const { status } = await callFn(null, NON_ADMIN_EMAIL, "GET");
  assertEquals(status, 401);
});

// ---------- Edge function payload validation ----------

Deno.test("edge function rejects OTP template missing {otp}", async () => {
  const bad = { ...validPayload, otp_template: "Your OTP code, please use it soon." };
  const { status } = await callFn(bad, ADMIN_EMAIL);
  assertEquals(status, 400);
});

Deno.test("edge function rejects out-of-range otp_length", async () => {
  const { status } = await callFn({ ...validPayload, otp_length: 12 }, ADMIN_EMAIL);
  assertEquals(status, 400);
});

Deno.test("edge function rejects out-of-range otp_validity_minutes", async () => {
  const { status } = await callFn({ ...validPayload, otp_validity_minutes: 999 }, ADMIN_EMAIL);
  assertEquals(status, 400);
});

// ---------- Admin happy path ----------

Deno.test("admin GET returns the full row (including sensitive fields)", async () => {
  const { status, body } = await callFn(null, ADMIN_EMAIL, "GET");
  assertEquals(status, 200);
  // Row may be null on a fresh project; if present, it must include sensitive keys.
  if (body?.row) {
    for (const col of ["twilio_account_sid", "msg91_template_id", "generic_endpoint_url"]) {
      assert(col in body.row, `admin GET must expose "${col}"`);
    }
  }
});

Deno.test("edge function accepts a valid admin update", async () => {
  const { status, body } = await callFn(validPayload, ADMIN_EMAIL);
  assert(status >= 200 && status < 300, `expected 2xx, got ${status}: ${JSON.stringify(body)}`);
});
