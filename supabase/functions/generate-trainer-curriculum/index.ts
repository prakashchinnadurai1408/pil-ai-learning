import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function callAI(prompt: string, system = "You are an expert curriculum designer for Indian UG/PG students. Always respond with valid JSON only, no markdown fences.") {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      temperature: 0.8,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI ${r.status}: ${t.slice(0, 200)}`);
  }
  const d = await r.json();
  let c = d.choices?.[0]?.message?.content || "";
  c = c.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(c);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode, curriculumId, ownerRole, ownerId, ownerName, ownerCollege, title, goal, description } = body;

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    if (mode === "full") {
      // Generate complete curriculum tree from a goal/JD.
      if (!goal || !title) {
        return new Response(JSON.stringify({ error: "title and goal are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const tree = await callAI(`Design a structured curriculum for the goal/JD below. Audience: Indian UG/PG students.

Goal: "${goal}"
Title: "${title}"

Return ONLY valid JSON of shape:
{
  "subjects": [
    {
      "title": "...",
      "description": "...",
      "topics": [
        {
          "title": "...",
          "description": "...",
          "subtopics": [{"title": "...", "content": "150-250 word lesson in markdown"}],
          "videos": [{"title": "...", "description": "...", "youtubeQuery": "...", "duration": "10:00"}],
          "quiz": [{"question": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "..."}]
        }
      ]
    }
  ],
  "assessment": {
    "title": "Final Assessment",
    "description": "...",
    "passingScore": 60,
    "timeLimitMinutes": 30,
    "questions": [{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]
  }
}

Constraints: 3-5 subjects, 2-4 topics per subject, 1-2 subtopics per topic, 1-2 videos per topic, 4-6 quiz questions per topic, 8-12 final assessment MCQs.`);

      // Insert curriculum
      const { data: curr, error: e1 } = await sb.from("trainer_curricula").insert({
        owner_role: ownerRole || "trainer",
        owner_id: ownerId || "",
        owner_name: ownerName || "",
        owner_college: ownerCollege || "",
        title, description: description || "", goal, status: "draft",
      }).select().single();
      if (e1) throw e1;

      let sIdx = 0;
      for (const subj of tree.subjects || []) {
        const { data: subjRow } = await sb.from("curriculum_subjects").insert({
          curriculum_id: curr.id, title: subj.title, description: subj.description || "", sort_order: sIdx++,
        }).select().single();
        let tIdx = 0;
        for (const top of subj.topics || []) {
          const { data: topRow } = await sb.from("curriculum_topics").insert({
            subject_id: subjRow!.id, title: top.title, description: top.description || "", sort_order: tIdx++,
          }).select().single();

          const subRows = (top.subtopics || []).map((st: any, i: number) => ({
            topic_id: topRow!.id, title: st.title, content: st.content || "", sort_order: i,
          }));
          if (subRows.length) await sb.from("curriculum_subtopics").insert(subRows);

          const vidRows = (top.videos || []).map((v: any, i: number) => ({
            topic_id: topRow!.id, title: v.title, description: v.description || "",
            youtube_query: v.youtubeQuery || "", youtube_id: v.youtubeId || "",
            duration: v.duration || "", sort_order: i,
          }));
          if (vidRows.length) await sb.from("curriculum_videos").insert(vidRows);

          if (Array.isArray(top.quiz) && top.quiz.length) {
            await sb.from("curriculum_quizzes").insert({
              topic_id: topRow!.id, title: `${top.title} Quiz`, questions: top.quiz,
            });
          }
        }
      }

      if (tree.assessment?.questions?.length) {
        await sb.from("curriculum_assessments").insert({
          curriculum_id: curr.id,
          title: tree.assessment.title || "Final Assessment",
          description: tree.assessment.description || "",
          questions: tree.assessment.questions,
          passing_score: tree.assessment.passingScore ?? 60,
          time_limit_minutes: tree.assessment.timeLimitMinutes ?? null,
        });
      }

      return new Response(JSON.stringify({ ok: true, curriculumId: curr.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "regenerate") {
      // Regenerate a single node. Expects { nodeType, nodeId, context }
      const { nodeType, nodeId, context } = body;
      if (!nodeType || !nodeId) {
        return new Response(JSON.stringify({ error: "nodeType and nodeId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const ctx = context || "";

      if (nodeType === "subtopic") {
        const out = await callAI(`Write a focused 200-word lesson (markdown) on: "${ctx}". Return JSON: {"content":"..."}`);
        await sb.from("curriculum_subtopics").update({ content: out.content || "" }).eq("id", nodeId);
        return new Response(JSON.stringify({ ok: true, content: out.content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (nodeType === "quiz") {
        const out = await callAI(`Generate 5 MCQs for "${ctx}". Return JSON: {"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]}`);
        await sb.from("curriculum_quizzes").update({ questions: out.questions || [] }).eq("id", nodeId);
        return new Response(JSON.stringify({ ok: true, questions: out.questions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (nodeType === "assessment") {
        const out = await callAI(`Generate 10 MCQs for the final assessment of "${ctx}". Return JSON: {"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]}`);
        await sb.from("curriculum_assessments").update({ questions: out.questions || [] }).eq("id", nodeId);
        return new Response(JSON.stringify({ ok: true, questions: out.questions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (nodeType === "subtopic_quiz") {
        // Generate quiz tied to a subtopic with difficulty
        const difficulty = (body.difficulty || "medium").toLowerCase();
        const count = Math.max(3, Math.min(10, Number(body.count) || 5));
        const out = await callAI(`Generate ${count} ${difficulty}-difficulty MCQs for the subtopic: "${ctx}". Each MCQ has 4 options, exactly one correct (0-3 index), and a 1-2 sentence explanation acting as the answer key. Return JSON: {"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"...","difficulty":"${difficulty}"}]}`);

        // Find topic_id for this subtopic
        const { data: stRow } = await sb.from("curriculum_subtopics").select("topic_id, title").eq("id", nodeId).maybeSingle();
        if (!stRow) throw new Error("subtopic not found");

        // Upsert by (subtopic_id, scope='subtopic')
        const { data: existing } = await sb.from("curriculum_quizzes").select("id").eq("subtopic_id", nodeId).eq("scope", "subtopic").maybeSingle();
        if (existing) {
          await sb.from("curriculum_quizzes").update({
            questions: out.questions || [], difficulty, title: `${(stRow as any).title} Quiz`,
          }).eq("id", (existing as any).id);
        } else {
          await sb.from("curriculum_quizzes").insert({
            topic_id: (stRow as any).topic_id, subtopic_id: nodeId, scope: "subtopic",
            difficulty, title: `${(stRow as any).title} Quiz`, questions: out.questions || [],
          });
        }
        return new Response(JSON.stringify({ ok: true, questions: out.questions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (nodeType === "subtopic_assessment") {
        const difficulty = (body.difficulty || "medium").toLowerCase();
        const count = Math.max(5, Math.min(15, Number(body.count) || 8));
        const out = await callAI(`Generate ${count} ${difficulty}-difficulty assessment MCQs for the subtopic: "${ctx}". Mix conceptual + applied. Each has 4 options, exactly one correct, and a clear answer-key explanation. Return JSON: {"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"...","difficulty":"${difficulty}"}]}`);

        const { data: stRow } = await sb.from("curriculum_subtopics").select("topic_id, title").eq("id", nodeId).maybeSingle();
        if (!stRow) throw new Error("subtopic not found");

        const { data: existing } = await sb.from("curriculum_quizzes").select("id").eq("subtopic_id", nodeId).eq("scope", "assessment").maybeSingle();
        if (existing) {
          await sb.from("curriculum_quizzes").update({
            questions: out.questions || [], difficulty, title: `${(stRow as any).title} Assessment`,
          }).eq("id", (existing as any).id);
        } else {
          await sb.from("curriculum_quizzes").insert({
            topic_id: (stRow as any).topic_id, subtopic_id: nodeId, scope: "assessment",
            difficulty, title: `${(stRow as any).title} Assessment`, questions: out.questions || [],
          });
        }
        return new Response(JSON.stringify({ ok: true, questions: out.questions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (nodeType === "videos") {
        // Regenerate video suggestions for a topic.
        const out = await callAI(`Suggest 2 YouTube educational videos for "${ctx}". Return JSON: {"videos":[{"title":"...","description":"...","youtubeQuery":"...","duration":"10:00"}]}`);
        await sb.from("curriculum_videos").delete().eq("topic_id", nodeId);
        const rows = (out.videos || []).map((v: any, i: number) => ({
          topic_id: nodeId, title: v.title, description: v.description || "",
          youtube_query: v.youtubeQuery || "", youtube_id: "", duration: v.duration || "", sort_order: i,
        }));
        if (rows.length) await sb.from("curriculum_videos").insert(rows);
        return new Response(JSON.stringify({ ok: true, videos: rows }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: "unknown nodeType" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown mode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("generate-trainer-curriculum error:", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || "internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
