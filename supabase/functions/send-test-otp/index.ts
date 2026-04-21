import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function generateOtp(len: number) {
  const n = Math.max(4, Math.min(8, len || 6));
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10);
  return out;
}

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.split(`{${k}}`).join(v),
    tpl,
  );
}

function normalizeMobile(raw: string) {
  const trimmed = (raw || "").trim().replace(/[\s-]/g, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  // Default to India if 10 digits
  if (/^\d{10}$/.test(trimmed)) return `+91${trimmed}`;
  return `+${trimmed}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { mobile } = await req.json().catch(() => ({}));
    if (!mobile || typeof mobile !== "string") {
      return json(400, { error: "mobile is required" });
    }
    const to = normalizeMobile(mobile);
    if (!/^\+\d{8,15}$/.test(to)) {
      return json(400, { error: "Invalid mobile number format" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings, error: sErr } = await supabase
      .from("sms_gateway_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (sErr || !settings) {
      return json(500, { error: "SMS settings not found" });
    }

    const otp = generateOtp(settings.otp_length || 6);
    const message = renderTemplate(settings.otp_template || "Your OTP is {otp}", {
      otp,
      sender: settings.sender_id || "",
    });

    const provider = settings.provider as "twilio" | "msg91" | "generic";
    let providerResp: any = null;

    if (provider === "twilio") {
      const sid = settings.twilio_account_sid;
      const token = Deno.env.get("TWILIO_AUTH_TOKEN");
      const from = settings.twilio_from_number;
      if (!sid || !from) return json(400, { error: "Twilio Account SID and From number required" });
      if (!token) return json(400, { error: "TWILIO_AUTH_TOKEN secret is not configured" });

      const body = new URLSearchParams({ To: to, From: from, Body: message });
      const r = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        },
      );
      providerResp = await r.json().catch(() => ({}));
      if (!r.ok) return json(502, { error: `Twilio: ${providerResp?.message || r.status}`, providerResp });
    } else if (provider === "msg91") {
      const authKey = Deno.env.get("MSG91_AUTH_KEY");
      if (!authKey) return json(400, { error: "MSG91_AUTH_KEY secret is not configured" });
      if (!settings.msg91_template_id) return json(400, { error: "MSG91 Template ID required" });

      const r = await fetch("https://control.msg91.com/api/v5/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", authkey: authKey },
        body: JSON.stringify({
          template_id: settings.msg91_template_id,
          mobile: to.replace(/^\+/, ""),
          otp,
          sender: settings.sender_id || undefined,
          DLT_TE_ID: settings.msg91_dlt_te_id || undefined,
        }),
      });
      providerResp = await r.json().catch(() => ({}));
      if (!r.ok || providerResp?.type === "error") {
        return json(502, { error: `MSG91: ${providerResp?.message || r.status}`, providerResp });
      }
    } else if (provider === "generic") {
      const url = settings.generic_endpoint_url;
      if (!url) return json(400, { error: "Generic endpoint URL required" });
      const authKey = Deno.env.get("SMS_GENERIC_AUTH_KEY") || "";

      const vars = {
        mobile: to,
        message,
        otp,
        sender: settings.sender_id || "",
        auth_key: authKey,
      };

      const headersIn = (settings.generic_headers as Record<string, string>) || {};
      const renderedHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(headersIn)) {
        renderedHeaders[k] = renderTemplate(String(v), vars);
      }
      if (!Object.keys(renderedHeaders).some((h) => h.toLowerCase() === "content-type")) {
        renderedHeaders["Content-Type"] = "application/json";
      }

      const renderedBody = renderTemplate(settings.generic_body_template || "", vars);
      const method = (settings.generic_http_method || "POST").toUpperCase();

      const init: RequestInit = { method, headers: renderedHeaders };
      if (method !== "GET") init.body = renderedBody;

      const r = await fetch(url, init);
      const text = await r.text();
      try { providerResp = JSON.parse(text); } catch { providerResp = { raw: text }; }
      if (!r.ok) return json(502, { error: `Generic gateway: HTTP ${r.status}`, providerResp });
    } else {
      return json(400, { error: `Unknown provider: ${provider}` });
    }

    return json(200, {
      ok: true,
      provider,
      to,
      message,
      otp_preview: otp.slice(0, 1) + "•".repeat(otp.length - 1),
      providerResp,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json(500, { error: msg });
  }
});
