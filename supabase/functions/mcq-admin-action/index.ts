// Server-side gateway for privileged Video → MCQ actions:
//   - publish / unpublish a lesson
//   - delete a lesson
//   - rollback to a previous version
//
// The caller must be authenticated AND hold the 'admin' role in user_roles.
// Coordinators (moderator) and regular users are rejected with 403 even if
// they bypass the UI.

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
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // --- AuthN: validate JWT from Authorization header ---
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Authentication required" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "Invalid session" }, 401);
  const userId = userRes.user.id;

  // --- AuthZ: must have the 'admin' role ---
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleErr) {
    console.error("has_role lookup failed:", roleErr);
    return json({ error: "Role check failed" }, 500);
  }
  if (!isAdmin) {
    return json({ error: "Admin role required for this action" }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const { action, lessonId, versionId } = body ?? {};
  if (!action || typeof action !== "string") return json({ error: "action is required" }, 400);
  if (!lessonId || typeof lessonId !== "string") return json({ error: "lessonId is required" }, 400);

  // --- Block all destructive actions while a regenerate job is running ---
  const { data: lesson, error: lessonErr } = await admin
    .from("video_lessons")
    .select("id,version,chapters,status,generation_status")
    .eq("id", lessonId)
    .maybeSingle();
  if (lessonErr || !lesson) return json({ error: "Lesson not found" }, 404);
  if (lesson.generation_status === "running" && action !== "delete") {
    return json({ error: "Lesson is currently regenerating — try again when it finishes." }, 409);
  }

  try {
    if (action === "publish" || action === "unpublish") {
      const next = action === "publish" ? "published" : "draft";
      const { error } = await admin.from("video_lessons").update({ status: next }).eq("id", lessonId);
      if (error) throw error;
      return json({ ok: true, status: next });
    }

    if (action === "delete") {
      const { error } = await admin.from("video_lessons").delete().eq("id", lessonId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "rollback") {
      if (!versionId || typeof versionId !== "string") return json({ error: "versionId is required" }, 400);
      const { data: v, error: vErr } = await admin
        .from("video_lesson_versions")
        .select("*")
        .eq("id", versionId)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      if (vErr || !v) return json({ error: "Version not found" }, 404);

      // 1. Snapshot current questions before replacing.
      const { data: currentQs } = await admin
        .from("video_lesson_questions")
        .select("chapter_index,chapter_title,chapter_start_seconds,question,options,correct,explanation,sort_order")
        .eq("lesson_id", lessonId);
      await admin.from("video_lesson_versions").insert({
        lesson_id: lessonId,
        version: lesson.version || 1,
        chapters: lesson.chapters || [],
        questions: currentQs || [],
        generated_by: userRes.user.email || "admin",
        note: `Auto-snapshot before rollback to v${v.version}`,
      });

      // 2. Wipe & restore.
      await admin.from("video_lesson_questions").delete().eq("lesson_id", lessonId);
      const rows = (v.questions || []).map((q: any, i: number) => ({
        lesson_id: lessonId,
        chapter_index: q.chapter_index ?? 0,
        chapter_title: q.chapter_title ?? "",
        chapter_start_seconds: q.chapter_start_seconds ?? 0,
        question: q.question,
        options: q.options || [],
        correct: q.correct ?? 0,
        explanation: q.explanation ?? "",
        sort_order: q.sort_order ?? i,
      }));
      if (rows.length) await admin.from("video_lesson_questions").insert(rows);

      // 3. Bump lesson to a new version.
      const newVersion = (lesson.version || 1) + 1;
      await admin.from("video_lessons").update({
        chapters: v.chapters || lesson.chapters,
        version: newVersion,
        last_regenerated_at: new Date().toISOString(),
        generation_status: "success",
        generation_error: "",
      }).eq("id", lessonId);

      return json({ ok: true, restoredFromVersion: v.version, newVersion });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("mcq-admin-action error:", err);
    return json({ error: err instanceof Error ? err.message : "Action failed" }, 500);
  }
});
