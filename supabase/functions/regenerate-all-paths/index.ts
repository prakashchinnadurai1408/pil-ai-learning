import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);

    // Find all candidates that already have an AI path (so we only regenerate existing ones)
    const { data: existingPaths } = await sb
      .from("candidate_learning_paths")
      .select("candidate_id");

    const candidateIds: string[] = Array.from(new Set((existingPaths || []).map((p: any) => p.candidate_id)));

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
          body: JSON.stringify({ candidateId, source: "scheduled" }),
        });
        if (resp.ok) success++;
        else failed++;
      } catch (e) {
        console.error("regen failed for", candidateId, e);
        failed++;
      }
      // small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 400));
    }

    // Update last_run on settings
    const { data: settings } = await sb.from("path_regeneration_settings").select("id").maybeSingle();
    if (settings?.id) {
      await sb
        .from("path_regeneration_settings")
        .update({ last_run_at: new Date().toISOString(), last_run_count: success })
        .eq("id", settings.id);
    }

    return new Response(JSON.stringify({ success: true, regenerated: success, failed, total: candidateIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("regenerate-all-paths error", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
