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
    const { candidateIds, overwrite } = await req.json();

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return new Response(JSON.stringify({ error: "candidateIds array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);

    // If not overwriting, filter out candidates that already have an active path
    let toProcess = candidateIds as string[];
    if (!overwrite) {
      const { data: existing } = await sb
        .from("candidate_learning_paths")
        .select("candidate_id")
        .in("candidate_id", candidateIds)
        .eq("status", "active");
      const existingSet = new Set((existing || []).map((r: any) => r.candidate_id));
      toProcess = candidateIds.filter((id: string) => !existingSet.has(id));
    }

    const skipped = candidateIds.length - toProcess.length;

    // Fire-and-forget: process in background using EdgeRuntime.waitUntil
    // so the HTTP response returns immediately to the client.
    const processAll = async () => {
      let success = 0;
      let failed = 0;
      const concurrency = 3;
      for (let i = 0; i < toProcess.length; i += concurrency) {
        const batch = toProcess.slice(i, i + concurrency);
        const results = await Promise.allSettled(
          batch.map(async (candidateId) => {
            const resp = await fetch(`${url}/functions/v1/generate-candidate-path`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
                apikey: key,
              },
              body: JSON.stringify({ candidateId, source: "admin-bulk" }),
            });
            if (!resp.ok) {
              const txt = await resp.text();
              throw new Error(`HTTP ${resp.status}: ${txt.slice(0, 200)}`);
            }
            return resp.json();
          })
        );
        results.forEach((r) => {
          if (r.status === "fulfilled") success++;
          else {
            failed++;
            console.error("bulk-generate failure:", r.reason);
          }
        });
        // small delay to be nice to AI gateway
        await new Promise((r) => setTimeout(r, 500));
      }
      console.log(`bulk-generate-candidate-paths complete: ${success} success, ${failed} failed, ${skipped} skipped`);
    };

    // @ts-ignore — EdgeRuntime is available in Deno deploy/Supabase functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processAll());
    } else {
      // Fallback: don't await, just kick off
      processAll().catch((e) => console.error("processAll error", e));
    }

    return new Response(
      JSON.stringify({
        success: true,
        queued: toProcess.length,
        skipped,
        total: candidateIds.length,
        message: `Started generating paths for ${toProcess.length} candidate(s) in background.${skipped > 0 ? ` Skipped ${skipped} already with paths.` : ""}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("bulk-generate-candidate-paths error", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
