// Grade an assessment attempt:
// - MCQ: auto-graded by index match
// - Descriptive: AI rubric grading on student text
// - Video: AI rubric grading on transcript (caller should pre-transcribe and pass it in `responses[qid].transcript`)
// - Coding: AI grading on submitted code vs expected_answer
// Writes per-question scores into ai_grading and updates total score + grading_status.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  attempt_id: string;
}

async function aiGrade(apiKey: string, question: string, expected: string, response: string, maxScore: number) {
  const prompt = `You are a strict but fair grader for an Indian undergraduate assessment.

QUESTION:
${question}

MODEL/EXPECTED ANSWER (rubric):
${expected || "(no rubric provided — grade on correctness, completeness, clarity)"}

STUDENT RESPONSE:
${response || "(empty)"}

MAX SCORE: ${maxScore}

Grade the student response. Return ONLY JSON:
{ "score": <integer 0..${maxScore}>, "feedback": "<2-3 sentence explanation>" }`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You grade student responses fairly. Return only JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("AI grade failed", res.status, t.slice(0, 300));
    return { score: 0, feedback: "AI grading failed; manual review needed." };
  }
  const j = await res.json();
  try {
    const parsed = JSON.parse(j.choices?.[0]?.message?.content || "{}");
    const score = Math.max(0, Math.min(maxScore, Math.round(Number(parsed.score) || 0)));
    return { score, feedback: String(parsed.feedback || "") };
  } catch {
    return { score: 0, feedback: "AI returned malformed grading." };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { attempt_id } = (await req.json()) as Body;
    if (!attempt_id) {
      return new Response(JSON.stringify({ error: "attempt_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load attempt
    const { data: attempt, error: aErr } = await supabase
      .from("assessment_attempts").select("*").eq("id", attempt_id).maybeSingle();
    if (aErr || !attempt) {
      return new Response(JSON.stringify({ error: "Attempt not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load questions
    const { data: questions, error: qErr } = await supabase
      .from("assessment_questions").select("*")
      .eq("assessment_id", attempt.assessment_id).order("sort_order");
    if (qErr || !questions) {
      return new Response(JSON.stringify({ error: "Questions not found" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responses: Record<string, any> = (attempt.responses as any) || {};
    const grading: Record<string, { score: number; max: number; feedback: string }> = {};
    let totalEarned = 0;
    let totalMax = 0;
    let correctCount = 0;

    for (const q of questions as any[]) {
      const max = Number(q.max_score) || 1;
      totalMax += max;
      const r = responses[q.id] || {};

      if (q.question_type === "mcq") {
        const picked = typeof r.choice === "number" ? r.choice : -1;
        const isCorrect = picked === q.correct;
        const score = isCorrect ? max : 0;
        if (isCorrect) correctCount += 1;
        grading[q.id] = { score, max, feedback: isCorrect ? "Correct" : `Correct answer was option ${(q.correct ?? 0) + 1}` };
        totalEarned += score;
      } else if (q.question_type === "descriptive") {
        const text = String(r.text || "");
        const g = await aiGrade(apiKey, q.question, q.expected_answer, text, max);
        grading[q.id] = { ...g, max };
        totalEarned += g.score;
        if (g.score >= Math.ceil(max * 0.6)) correctCount += 1;
      } else if (q.question_type === "video") {
        const transcript = String(r.transcript || "");
        const g = await aiGrade(apiKey, q.question, q.expected_answer, transcript || "(no transcript)", max);
        grading[q.id] = { ...g, max };
        totalEarned += g.score;
        if (g.score >= Math.ceil(max * 0.6)) correctCount += 1;
      } else if (q.question_type === "coding") {
        const code = String(r.code || "");
        const stdout = String(r.stdout || "");
        const combined = `LANGUAGE: ${q.language || "unknown"}\nSUBMITTED CODE:\n${code}\n\nSAMPLE OUTPUT FROM EXECUTION:\n${stdout || "(not run)"}`;
        const g = await aiGrade(apiKey, q.question, q.expected_answer, combined, max);
        grading[q.id] = { ...g, max };
        totalEarned += g.score;
        if (g.score >= Math.ceil(max * 0.6)) correctCount += 1;
      } else {
        grading[q.id] = { score: 0, max, feedback: "Unknown question type" };
      }
    }

    const scorePct = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

    const { error: uErr } = await supabase
      .from("assessment_attempts")
      .update({
        ai_grading: grading,
        score: scorePct,
        correct_answers: correctCount,
        total_questions: questions.length,
        grading_status: "graded",
        completed_at: attempt.completed_at || new Date().toISOString(),
      })
      .eq("id", attempt_id);

    if (uErr) {
      console.error("update attempt failed", uErr);
      return new Response(JSON.stringify({ error: uErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      attempt_id, score: scorePct, total_earned: totalEarned, total_max: totalMax,
      correct: correctCount, grading,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("grade-assessment-attempt error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
