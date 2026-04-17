import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Decide whether the schedule is "due" right now based on settings.
// `force` (manual Run Now) bypasses the schedule check.
function isDue(settings: any, now: Date): boolean {
  if (!settings) return false;
  const freq = (settings.frequency || "weekly").toLowerCase();
  const hour = settings.hour_utc ?? 2;
  const minute = settings.minute_utc ?? 0;

  // Allow a +/- 30-minute window so a once-an-hour cron can pick it up.
  const targetMinutes = hour * 60 + minute;
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const withinTime = Math.abs(nowMinutes - targetMinutes) <= 30;
  if (!withinTime) return false;

  // Avoid double-runs in the same window
  if (settings.last_run_at) {
    const last = new Date(settings.last_run_at).getTime();
    if (now.getTime() - last < 60 * 60 * 1000) return false; // <1h since last run
  }

  if (freq === "daily") return true;
  if (freq === "weekly") return now.getUTCDay() === (settings.day_of_week ?? 1);
  if (freq === "biweekly") {
    if (now.getUTCDay() !== (settings.day_of_week ?? 1)) return false;
    // Run every other week: based on week-of-year parity
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const week = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000));
    return week % 2 === 0;
  }
  if (freq === "monthly") return now.getUTCDate() === (settings.day_of_month ?? 1);
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);

    let force = false;
    try {
      const body = await req.json();
      force = !!body?.force;
    } catch {
      // no body — treat as scheduled call
    }

    const { data: settings } = await sb
      .from("path_regeneration_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!force) {
      if (!settings?.enabled) {
        return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!isDue(settings, new Date())) {
        return new Response(JSON.stringify({ skipped: true, reason: "not_due" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: existingPaths } = await sb
      .from("candidate_learning_paths")
      .select("candidate_id");

    const candidateIds: string[] = Array.from(
      new Set((existingPaths || []).map((p: any) => p.candidate_id))
    );

    let success = 0;
    let failed = 0;

    for (const candidateId of candidateIds) {
      try {
        const resp = await fetch(`${url}/functions/v1/generate-candidate-path`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({ candidateId, source: force ? "manual" : "scheduled" }),
        });
        if (resp.ok) success++;
        else failed++;
      } catch (e) {
        console.error("regen failed for", candidateId, e);
        failed++;
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    if (settings?.id) {
      await sb
        .from("path_regeneration_settings")
        .update({ last_run_at: new Date().toISOString(), last_run_count: success })
        .eq("id", settings.id);
    }

    return new Response(
      JSON.stringify({ success: true, regenerated: success, failed, total: candidateIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("regenerate-all-paths error", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
