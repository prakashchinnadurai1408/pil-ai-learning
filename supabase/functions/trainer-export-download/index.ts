import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { jobId, trainerId, trainerEmail } = await req.json();
    if (!jobId || !trainerId || !trainerEmail) {
      return new Response(JSON.stringify({ error: "jobId, trainerId, trainerEmail required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: job, error } = await admin.rpc("get_trainer_export_job", {
      _trainer_id: trainerId, _email: trainerEmail, _job_id: jobId,
    });
    if (error || !job || !job.file_path) {
      return new Response(JSON.stringify({ error: "Not found or unauthorized" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: signed, error: sErr } = await admin.storage
      .from("trainer-exports")
      .createSignedUrl(job.file_path, 60 * 60); // 1 hour
    if (sErr || !signed) {
      return new Response(JSON.stringify({ error: sErr?.message || "Signing failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ url: signed.signedUrl, format: job.format, size: job.file_size_bytes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
