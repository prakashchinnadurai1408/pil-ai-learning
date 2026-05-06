// Cron job: pre-generates today's practice plan for every active student
// who logged in within the last 7 days and doesn't yet have a plan for today.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  // Active students: any student with module progress activity in last 7 days
  const { data: progress } = await supabase
    .from("student_module_progress")
    .select("student_id, student_name")
    .gte("updated_at", sevenDaysAgo)
    .limit(500);

  const seen = new Set<string>();
  const candidates: { id: string; name: string }[] = [];
  for (const p of progress || []) {
    if (!p.student_id || seen.has(p.student_id)) continue;
    seen.add(p.student_id);
    candidates.push({ id: p.student_id, name: p.student_name || "" });
  }

  // Skip those who already have today's plan
  const { data: existing } = await supabase
    .from("practice_plans")
    .select("student_id")
    .eq("plan_date", today)
    .in("student_id", candidates.map((c) => c.id));
  const have = new Set((existing || []).map((e: any) => e.student_id));
  const toGenerate = candidates.filter((c) => !have.has(c.id));

  let generated = 0, failed = 0;
  for (const s of toGenerate.slice(0, 50)) {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/generate-practice-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({ studentId: s.id, studentName: s.name, force: false }),
      });
      if (r.ok) generated++; else failed++;
      // Avoid hitting AI rate limits
      await new Promise((res) => setTimeout(res, 250));
    } catch {
      failed++;
    }
  }

  return json({ ok: true, candidates: candidates.length, toGenerate: toGenerate.length, generated, failed });
});
