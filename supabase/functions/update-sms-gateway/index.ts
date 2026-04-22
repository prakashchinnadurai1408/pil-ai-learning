import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-email",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ALLOWED_PROVIDERS = ["twilio", "msg91", "generic"] as const;
const ALLOWED_METHODS = ["GET", "POST", "PUT"] as const;
const REQUIRED_TEMPLATE_TOKEN = "{otp}";

function validatePayload(p: any): { ok: true; clean: any } | { ok: false; error: string } {
  if (!p || typeof p !== "object") return { ok: false, error: "Invalid payload" };

  // Provider
  if (!ALLOWED_PROVIDERS.includes(p.provider)) {
    return { ok: false, error: `Provider must be one of: ${ALLOWED_PROVIDERS.join(", ")}` };
  }

  // OTP template
  const tpl = String(p.otp_template ?? "").trim();
  if (tpl.length < 10 || tpl.length > 300) {
    return { ok: false, error: "OTP template must be 10–300 characters." };
  }
  if (!tpl.includes(REQUIRED_TEMPLATE_TOKEN)) {
    return { ok: false, error: "OTP template must contain the {otp} placeholder." };
  }

  // OTP length: 4–8
  const otpLen = Number(p.otp_length);
  if (!Number.isInteger(otpLen) || otpLen < 4 || otpLen > 8) {
    return { ok: false, error: "OTP length must be an integer between 4 and 8." };
  }

  // Validity: 1–30 minutes
  const validity = Number(p.otp_validity_minutes);
  if (!Number.isInteger(validity) || validity < 1 || validity > 30) {
    return { ok: false, error: "OTP validity must be between 1 and 30 minutes." };
  }

  // Sender ID (optional, max 32)
  const sender = String(p.sender_id ?? "");
  if (sender.length > 32) return { ok: false, error: "Sender ID must be ≤ 32 characters." };

  // Generic method
  const method = String(p.generic_http_method || "POST").toUpperCase();
  if (!ALLOWED_METHODS.includes(method as any)) {
    return { ok: false, error: `HTTP method must be one of: ${ALLOWED_METHODS.join(", ")}` };
  }

  // Generic headers must be a flat object of strings
  const headers = p.generic_headers ?? {};
  if (typeof headers !== "object" || Array.isArray(headers)) {
    return { ok: false, error: "Generic headers must be a JSON object." };
  }
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v !== "string") {
      return { ok: false, error: `Header "${k}" value must be a string.` };
    }
  }

  // Provider-specific lightweight checks (only when enabled)
  if (p.enabled) {
    if (p.provider === "twilio") {
      if (!String(p.twilio_account_sid || "").startsWith("AC")) {
        return { ok: false, error: "Twilio Account SID must start with 'AC'." };
      }
      if (!/^\+\d{8,15}$/.test(String(p.twilio_from_number || ""))) {
        return { ok: false, error: "Twilio From number must be E.164 (e.g. +15558675310)." };
      }
    }
    if (p.provider === "msg91" && !String(p.msg91_template_id || "").trim()) {
      return { ok: false, error: "MSG91 Template ID is required when enabled." };
    }
    if (p.provider === "generic") {
      const url = String(p.generic_endpoint_url || "");
      try {
        const u = new URL(url);
        if (!/^https?:$/.test(u.protocol)) throw new Error();
      } catch {
        return { ok: false, error: "Generic endpoint URL must be a valid http(s) URL." };
      }
    }
  }

  return {
    ok: true,
    clean: {
      provider: p.provider,
      enabled: !!p.enabled,
      sender_id: sender,
      otp_template: tpl,
      otp_length: otpLen,
      otp_validity_minutes: validity,
      twilio_account_sid: String(p.twilio_account_sid || ""),
      twilio_from_number: String(p.twilio_from_number || ""),
      msg91_template_id: String(p.msg91_template_id || ""),
      msg91_dlt_te_id: String(p.msg91_dlt_te_id || ""),
      generic_endpoint_url: String(p.generic_endpoint_url || ""),
      generic_http_method: method,
      generic_headers: headers,
      generic_body_template: String(p.generic_body_template || ""),
    },
  };
}

const ADMIN_EMAILS = new Set(["prakash.chinnadurai@gmail.com"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const adminEmail = (req.headers.get("x-admin-email") || "").toLowerCase().trim();
    if (!adminEmail || !ADMIN_EMAILS.has(adminEmail)) {
      return json(401, { error: "Admin authentication required" });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // GET → return full row (admin only) so the settings UI can populate.
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("sms_gateway_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) return json(500, { error: error.message });
      return json(200, { row: data });
    }

    const payload = await req.json().catch(() => null);
    const result = validatePayload(payload);
    if (!result.ok) return json(400, { error: result.error });

    const { data: existing } = await supabaseAdmin
      .from("sms_gateway_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    const update = {
      ...result.clean,
      updated_at: new Date().toISOString(),
      updated_by: adminEmail,
    };

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("sms_gateway_settings")
        .update(update)
        .eq("id", existing.id);
      if (error) return json(500, { error: error.message });
    } else {
      const { error } = await supabaseAdmin.from("sms_gateway_settings").insert(update);
      if (error) return json(500, { error: error.message });
    }

    return json(200, { ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json(500, { error: msg });
  }
});
