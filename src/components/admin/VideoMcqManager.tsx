import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Youtube, Sparkles, Trash2, Eye, RefreshCw, Plus, CheckCircle2, AlertTriangle, ListTodo, History, RotateCw, Save, Pencil, Undo2, Search, Lock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAdminModules } from "@/hooks/useAdminModules";
import { useUserRole } from "@/hooks/useUserRole";

interface VideoLesson {
  id: string; title: string; description: string; youtube_url: string; youtube_video_id: string;
  thumbnail_url: string; duration_seconds: number; module_id: number | null;
  status: string; generation_status: string; generation_error: string;
  chapters: { title: string; startSeconds: number }[]; created_at: string;
  version: number; last_regenerated_at: string | null;
}
interface LessonQuestion {
  id: string; lesson_id: string; chapter_index: number; chapter_title: string;
  chapter_start_seconds: number; question: string; options: string[];
  correct: number; explanation: string; sort_order: number;
}
interface LessonVersion {
  id: string; lesson_id: string; version: number; chapters: any[]; questions: any[];
  generated_at: string; generated_by: string; note: string;
}

// ---- Validation for an inline-edited MCQ ----
function validateQuestion(q: { question: string; options: string[]; correct: number }): string | null {
  if (!q.question.trim()) return "Question text is required";
  if (q.question.trim().length < 8) return "Question is too short";
  if (!Array.isArray(q.options) || q.options.length !== 4) return "Exactly 4 options required";
  const trimmed = q.options.map((o) => o.trim());
  if (trimmed.some((o) => !o)) return "All 4 options must be filled";
  const lower = trimmed.map((o) => o.toLowerCase());
  if (new Set(lower).size !== 4) return "Options must be unique";
  if (q.correct < 0 || q.correct > 3) return "Pick a correct answer (A–D)";
  return null;
}

const VideoMcqManager = () => {
  const { adminModules } = useAdminModules();
  const { isAdmin, isCoordinator } = useUserRole();
  const [historySearch, setHistorySearch] = useState("");
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ youtubeUrl: "", title: "", moduleId: "" });
  const [previewLesson, setPreviewLesson] = useState<VideoLesson | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<LessonQuestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<LessonQuestion | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [historyLesson, setHistoryLesson] = useState<VideoLesson | null>(null);
  const [versions, setVersions] = useState<LessonVersion[]>([]);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [regenNote, setRegenNote] = useState<{ id: string; note: string } | null>(null);
  // Retry tracking — { lessonId: { attempts, nextAttemptAt, timer } }
  // Backoff: 5s, 15s, 45s (cap at 3 auto-retries before requiring a manual retry).
  const [retryState, setRetryState] = useState<Record<string, { attempts: number; nextAttemptAt: number | null }>>({});
  const retryTimersRef = useRef<Record<string, number>>({});
  const pollRef = useRef<number | null>(null);
  // 1Hz tick used purely to re-render live countdowns for scheduled auto-retries.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const hasPending = Object.values(retryState).some((r) => r.nextAttemptAt && r.nextAttemptAt > Date.now());
    if (!hasPending) return;
    const t = window.setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [retryState]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("video_lessons").select("*").order("created_at", { ascending: false });
    setLessons((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); return () => { if (pollRef.current) window.clearInterval(pollRef.current); }; }, []);

  // Auto-poll while any lesson is in 'running' — also re-fetches preview question count for live progress.
  useEffect(() => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    if (lessons.some((l) => l.generation_status === "running")) {
      pollRef.current = window.setInterval(() => { load(); refreshRunningCounts(); }, 3500);
    }
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons.map((l) => l.id + l.generation_status).join(",")]);

  // Auto-retry on failure with exponential backoff (5s → 15s → 45s, max 3 attempts).
  // We watch every lesson that flips to "failed" and schedule the next attempt.
  useEffect(() => {
    if (!isAdmin) return;
    lessons.forEach((l) => {
      if (l.generation_status !== "failed") {
        // Clear any scheduled timer if the lesson is no longer failed.
        const t = retryTimersRef.current[l.id];
        if (t) { window.clearTimeout(t); delete retryTimersRef.current[l.id]; }
        return;
      }
      // Skip non-retryable errors (auth/credit/quota issues — manual fix needed).
      const errLower = (l.generation_error || "").toLowerCase();
      const nonRetryable = errLower.includes("credit") || errLower.includes("admin role") || errLower.includes("authentication");
      if (nonRetryable) return;
      const state = retryState[l.id] ?? { attempts: 0, nextAttemptAt: null };
      if (state.attempts >= MAX_AUTO_RETRIES) return;
      if (retryTimersRef.current[l.id]) return; // already scheduled
      const delayMs = RETRY_DELAYS_SEC[state.attempts] * 1000;
      const nextAt = Date.now() + delayMs;
      setRetryState((s) => ({ ...s, [l.id]: { attempts: state.attempts, nextAttemptAt: nextAt } }));
      retryTimersRef.current[l.id] = window.setTimeout(async () => {
        delete retryTimersRef.current[l.id];
        setRetryState((s) => ({ ...s, [l.id]: { attempts: state.attempts + 1, nextAttemptAt: null } }));
        await triggerRegenerate(l, { silent: true });
      }, delayMs);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons.map((l) => l.id + l.generation_status + l.generation_error).join(","), isAdmin]);

  // Live MCQ-row counts per running lesson, used to show "X / Y chapters processed".
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const refreshRunningCounts = async () => {
    const running = lessons.filter((l) => l.generation_status === "running");
    if (!running.length) return;
    const next: Record<string, number> = {};
    await Promise.all(running.map(async (l) => {
      const { count } = await supabase
        .from("video_lesson_questions")
        .select("id", { count: "exact", head: true })
        .eq("lesson_id", l.id);
      next[l.id] = count || 0;
    }));
    setLiveCounts((prev) => ({ ...prev, ...next }));
  };

  const handleGenerate = async () => {
    if (!form.youtubeUrl.trim()) { toast.error("Paste a YouTube URL"); return; }
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-video-mcqs", {
      body: {
        youtubeUrl: form.youtubeUrl.trim(),
        title: form.title.trim() || undefined,
        moduleId: form.moduleId ? Number(form.moduleId) : null,
        createdBy: "admin",
      },
    });
    setGenerating(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Generation failed");
    } else {
      toast.success(`Generated ${(data as any).questionCount} questions across ${(data as any).chapterCount} chapters.`);
      setForm({ youtubeUrl: "", title: "", moduleId: "" });
    }
    load();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) { toast.error("Only admins can delete lessons"); return; }
    if (!confirm("Delete this lesson and all its generated questions?")) return;
    const { data, error } = await supabase.functions.invoke("mcq-admin-action", { body: { action: "delete", lessonId: id } });
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "Could not delete"); return; }
    toast.success("Lesson deleted");
    load();
  };

  const handlePublish = async (l: VideoLesson) => {
    if (!isAdmin) { toast.error("Only admins can publish or unpublish MCQ versions"); return; }
    if (l.generation_status === "running") { toast.error("Cannot publish while regeneration is running"); return; }
    // Block publish if any question fails validation (client-side fast check before round-trip)
    if (l.status !== "published") {
      const { data: qs } = await supabase.from("video_lesson_questions").select("question,options,correct").eq("lesson_id", l.id);
      const bad = (qs || []).find((q: any) => validateQuestion({ question: q.question, options: q.options || [], correct: q.correct }));
      if (bad) { toast.error("Fix invalid questions before publishing — open Preview to edit."); return; }
    }
    const action = l.status === "published" ? "unpublish" : "publish";
    const { data, error } = await supabase.functions.invoke("mcq-admin-action", { body: { action, lessonId: l.id } });
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "Update failed"); return; }
    toast.success(`Lesson ${action === "publish" ? "published" : "moved to draft"}`);
    load();
  };

  const MAX_AUTO_RETRIES = 3;
  // Backoff schedule (seconds). Index 0 → first auto-retry after the initial failure.
  const RETRY_DELAYS_SEC = [5, 15, 45];

  // Shared regenerate path. `silent` is used by auto-retries so we don't spam toasts;
  // `attemptNumber` (1-indexed) is shown in toasts when it's a manual retry.
  const triggerRegenerate = async (l: VideoLesson, opts: { silent?: boolean; attemptNumber?: number; note?: string } = {}) => {
    if (!isAdmin) { if (!opts.silent) toast.error("Only admins can regenerate MCQs"); return; }
    const note = opts.note ?? "";
    setLiveCounts((p) => ({ ...p, [l.id]: 0 }));
    if (!opts.silent) {
      toast.info(
        opts.attemptNumber && opts.attemptNumber > 1
          ? `Retrying "${l.title}" — attempt ${opts.attemptNumber}…`
          : `Regenerating MCQs for "${l.title}"… (v${(l.version || 1) + 1})`
      );
    }
    const { data, error } = await supabase.functions.invoke("generate-video-mcqs", {
      body: { youtubeUrl: l.youtube_url, regenerateLessonId: l.id, createdBy: "admin", note },
    });
    if (error || (data as any)?.error) {
      if (!opts.silent) toast.error((data as any)?.error || error?.message || "Regeneration failed");
    } else if (!opts.silent) {
      toast.success(`Regenerated to v${(data as any).version}: ${(data as any).questionCount} new questions.`);
      // Successful run — clear any retry tracking for this lesson.
      setRetryState((s) => { const n = { ...s }; delete n[l.id]; return n; });
    }
    load();
  };

  const handleRegenerate = async (l: VideoLesson) => {
    const note = regenNote?.id === l.id ? regenNote.note.trim() : "";
    setRegenNote(null);
    // Manual user-initiated regenerate resets the auto-retry counter.
    setRetryState((s) => ({ ...s, [l.id]: { attempts: 0, nextAttemptAt: null } }));
    await triggerRegenerate(l, { note });
  };

  // Manual retry button on a failed lesson — counts as the next attempt and
  // resets the backoff window for any future auto-retries.
  const handleManualRetry = async (l: VideoLesson) => {
    if (!isAdmin) { toast.error("Only admins can retry MCQ generation"); return; }
    // Cancel any pending auto-retry timer.
    const t = retryTimersRef.current[l.id];
    if (t) { window.clearTimeout(t); delete retryTimersRef.current[l.id]; }
    const current = retryState[l.id]?.attempts ?? 0;
    setRetryState((s) => ({ ...s, [l.id]: { attempts: current + 1, nextAttemptAt: null } }));
    await triggerRegenerate(l, { attemptNumber: current + 1 });
  };


  const openHistory = async (l: VideoLesson) => {
    setHistoryLesson(l);
    const { data } = await supabase
      .from("video_lesson_versions").select("*").eq("lesson_id", l.id).order("version", { ascending: false });
    setVersions((data ?? []) as any);
  };

  const rollbackToVersion = async (v: LessonVersion) => {
    if (!historyLesson) return;
    if (!isAdmin) { toast.error("Only admins can rollback MCQ versions"); return; }
    if (historyLesson.generation_status === "running") { toast.error("Cannot rollback while regeneration is running"); return; }
    if (!confirm(`Republish version v${v.version}? Current published questions will be archived as a new snapshot before being replaced.`)) return;
    setRollingBackId(v.id);
    try {
      // Server-side rollback enforces admin role + atomic snapshot/restore.
      const { data, error } = await supabase.functions.invoke("mcq-admin-action", {
        body: { action: "rollback", lessonId: historyLesson.id, versionId: v.id },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "Rollback failed");
        return;
      }
      toast.success(`Rolled back to v${v.version} (now published as v${(data as any).newVersion}).`);
      setHistoryLesson(null);
      setVersions([]);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Rollback failed");
    } finally {
      setRollingBackId(null);
    }
  };

  const openPreview = async (l: VideoLesson) => {
    setPreviewLesson(l);
    setEditingId(null);
    setEditDraft(null);
    const { data } = await supabase.from("video_lesson_questions").select("*").eq("lesson_id", l.id).order("chapter_index").order("sort_order");
    setPreviewQuestions((data ?? []) as any);
  };

  const startEdit = (q: LessonQuestion) => {
    setEditingId(q.id);
    setEditDraft({ ...q, options: [...q.options] });
  };

  const saveEdit = async () => {
    if (!editDraft) return;
    const err = validateQuestion(editDraft);
    if (err) { toast.error(err); return; }
    setSavingEdit(true);
    const { error } = await supabase.from("video_lesson_questions").update({
      question: editDraft.question.trim(),
      options: editDraft.options.map((o) => o.trim()),
      correct: editDraft.correct,
      explanation: editDraft.explanation.trim(),
    }).eq("id", editDraft.id);
    setSavingEdit(false);
    if (error) { toast.error("Save failed"); return; }
    toast.success("Question updated");
    setPreviewQuestions((arr) => arr.map((q) => q.id === editDraft.id ? { ...editDraft } : q));
    setEditingId(null);
    setEditDraft(null);
  };

  const deleteQuestion = async (q: LessonQuestion) => {
    if (!confirm("Remove this question?")) return;
    const { error } = await supabase.from("video_lesson_questions").delete().eq("id", q.id);
    if (error) { toast.error("Delete failed"); return; }
    setPreviewQuestions((arr) => arr.filter((x) => x.id !== q.id));
    toast.success("Question removed");
  };

  const grouped = (qs: LessonQuestion[]) => {
    const map = new Map<number, LessonQuestion[]>();
    for (const q of qs) {
      const arr = map.get(q.chapter_index) ?? [];
      arr.push(q); map.set(q.chapter_index, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  };

  const previewValidation = useMemo(() => {
    if (!previewLesson) return { invalid: 0, total: 0 };
    let invalid = 0;
    for (const q of previewQuestions) if (validateQuestion(q)) invalid++;
    return { invalid, total: previewQuestions.length };
  }, [previewQuestions, previewLesson]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Youtube className="h-6 w-6 text-destructive" /> Video Lessons → Auto-MCQs
        </h2>
        <p className="text-muted-foreground text-sm">Paste a YouTube URL — chapters are detected and chapter-wise multiple-choice questions are generated automatically.</p>
      </div>

      {isCoordinator && (
        <div className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-sm flex items-center gap-2">
          <Lock className="h-4 w-4 text-warning" />
          <span><strong>Coordinator view</strong> — you can preview lessons and review version history, but only admins can publish, regenerate, or rollback MCQ versions.</span>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Add a new video lesson</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="https://youtube.com/watch?v=..." value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} />
            <Input placeholder="Lesson title (optional — auto from YouTube)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={form.moduleId} onValueChange={(v) => setForm({ ...form, moduleId: v })}>
              <SelectTrigger className="sm:w-72"><SelectValue placeholder="Link to module (optional)" /></SelectTrigger>
              <SelectContent>
                {adminModules.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Chapter MCQs
            </Button>
          </div>
        </CardContent>
      </Card>

      {(() => {
        const running = lessons.filter((l) => l.generation_status === "running");
        if (running.length === 0) return null;
        return (
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Live regeneration in progress ({running.length} lesson{running.length > 1 ? "s" : ""})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Preview, edit, publish, regenerate, delete and rollback are temporarily disabled for these lessons until each job completes.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {running.map((l) => {
                const totalChapters = l.chapters?.length || 0;
                const liveCount = liveCounts[l.id] ?? 0;
                const chaptersProcessed = Math.min(totalChapters, Math.ceil(liveCount / 3));
                const pct = totalChapters ? Math.round((chaptersProcessed / totalChapters) * 100) : 0;
                const currentChapter = l.chapters?.[Math.min(chaptersProcessed, Math.max(0, totalChapters - 1))];
                return (
                  <div key={l.id} className="rounded-md border border-border bg-background p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{l.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Generating v{l.version || 1} · processing chapter {Math.min(chaptersProcessed + 1, totalChapters)} of {totalChapters}
                          {currentChapter ? ` — "${currentChapter.title}"` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">{liveCount} questions saved</Badge>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{pct}% complete</span>
                      <span>~3 MCQs per chapter</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })()}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Library ({lessons.length})</span>
            <Button variant="ghost" size="sm" onClick={load} className="gap-1.5"><RefreshCw className="h-4 w-4" /> Refresh</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : lessons.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No video lessons yet. Add one above to start.</div>
          ) : (
            <div className="grid gap-3">
              {lessons.map((l) => {
                const totalChapters = l.chapters?.length || 0;
                const liveCount = liveCounts[l.id] ?? 0;
                // Each chapter produces ~3 MCQs, so divide live-count to estimate chapters processed.
                const chaptersProcessed = Math.min(totalChapters, Math.ceil(liveCount / 3));
                const pct = totalChapters ? Math.round((chaptersProcessed / totalChapters) * 100) : 0;
                return (
                <div key={l.id} className="flex flex-col sm:flex-row gap-3 p-3 border border-border rounded-lg">
                  {l.thumbnail_url && <img src={l.thumbnail_url} alt={l.title} className="w-full sm:w-40 h-24 object-cover rounded" loading="lazy" />}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold truncate">{l.title}</h3>
                      <Badge variant={l.status === "published" ? "default" : "secondary"} className="text-xs">{l.status}</Badge>
                      <Badge variant="outline" className="text-xs">v{l.version || 1}</Badge>
                      {l.generation_status === "running" && <Badge variant="outline" className="text-xs gap-1"><Loader2 className="h-3 w-3 animate-spin" /> generating</Badge>}
                      {l.generation_status === "success" && <Badge variant="outline" className="text-xs gap-1 text-success border-success"><CheckCircle2 className="h-3 w-3" /> ready</Badge>}
                      {l.generation_status === "failed" && <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> failed</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{totalChapters} chapters · {Math.round((l.duration_seconds || 0) / 60)} min</p>
                    {l.last_regenerated_at && <p className="text-xs text-muted-foreground">Last regenerated {new Date(l.last_regenerated_at).toLocaleString()}</p>}
                    {l.generation_status === "running" && totalChapters > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Generating chapter MCQs…</span>
                          <span className="font-medium">{chaptersProcessed} / {totalChapters} chapters · {liveCount} questions</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    )}
                    {l.generation_status === "failed" && l.generation_error && (
                      <div className="mt-1 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive space-y-1.5">
                        <div className="flex gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span><span className="font-semibold">Error:</span> {l.generation_error}</span>
                        </div>
                        {(() => {
                          const rs = retryState[l.id];
                          const attempts = rs?.attempts ?? 0;
                          const nextAt = rs?.nextAttemptAt;
                          const remaining = nextAt ? Math.max(0, Math.ceil((nextAt - Date.now()) / 1000)) : null;
                          if (attempts >= MAX_AUTO_RETRIES) {
                            return <p className="text-[11px]">Auto-retry exhausted ({MAX_AUTO_RETRIES} attempts). Use the Retry button to try again manually.</p>;
                          }
                          if (remaining !== null) {
                            return <p className="text-[11px]">Auto-retry #{attempts + 1} in ~{remaining}s (backoff: {RETRY_DELAYS_SEC.join("s, ")}s).</p>;
                          }
                          return null;
                        })()}
                        <div className="flex justify-end">
                          {(() => {
                            const rs = retryState[l.id];
                            const nextAt = rs?.nextAttemptAt ?? null;
                            const remaining = nextAt ? Math.max(0, Math.ceil((nextAt - Date.now()) / 1000)) : 0;
                            const isAwaitingRetry = remaining > 0;
                            const tip = !isAdmin
                              ? "Requires the Admin role."
                              : isAwaitingRetry
                                ? `Auto-retry in ${remaining}s — please wait or it will run automatically.`
                                : "Retry MCQ generation now (cancels any pending auto-retry).";
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => handleManualRetry(l)}
                                disabled={!isAdmin || isAwaitingRetry}
                                title={tip}
                              >
                                <RotateCw className="h-3 w-3" />
                                {isAwaitingRetry ? `Retry in ${remaining}s` : "Retry now"}
                              </Button>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 sm:flex-col">
                    {(() => {
                      const isRunning = l.generation_status === "running";
                      const runningTip = "Disabled while this lesson is regenerating — wait for the job to finish.";
                      const coordinatorTip = "Requires the Admin role. Coordinators have view-only access to MCQ workflows.";
                      // Build the most informative tooltip per button (role first, then run-state).
                      const previewTip = isRunning ? runningTip : undefined;
                      const regenTip = !isAdmin ? coordinatorTip : isRunning ? runningTip : undefined;
                      const publishTip = !isAdmin
                        ? coordinatorTip
                        : isRunning
                          ? runningTip
                          : l.generation_status !== "success"
                            ? "Lesson must finish generating successfully before it can be published."
                            : undefined;
                      const deleteTip = !isAdmin ? coordinatorTip : isRunning ? runningTip : undefined;
                      return (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openPreview(l)} disabled={isRunning} title={previewTip} className="gap-1.5"><Eye className="h-4 w-4" /> Preview & Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => setRegenNote({ id: l.id, note: "" })} disabled={isRunning || !isAdmin} title={regenTip} className="gap-1.5">
                            <RotateCw className="h-4 w-4" /> Regenerate
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openHistory(l)} className="gap-1.5" title="Anyone can view version history. Rollback is admin-only.">
                            <History className="h-4 w-4" /> History
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handlePublish(l)} disabled={l.generation_status !== "success" || isRunning || !isAdmin} title={publishTip}>
                            {l.status === "published" ? "Unpublish" : "Publish"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(l.id)} disabled={isRunning || !isAdmin} title={deleteTip} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              );})}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview & inline edit dialog */}
      <Dialog open={!!previewLesson} onOpenChange={(o) => !o && setPreviewLesson(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5" /> {previewLesson?.title}</DialogTitle>
          </DialogHeader>
          {previewLesson && (
            <div className="space-y-4">
              <div className="aspect-video w-full">
                <iframe className="w-full h-full rounded" src={`https://www.youtube.com/embed/${previewLesson.youtube_video_id}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs">
                <span className="text-muted-foreground">{previewValidation.total} questions total</span>
                {previewValidation.invalid > 0 ? (
                  <span className="text-destructive font-medium flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {previewValidation.invalid} need fixing before publish</span>
                ) : (
                  <span className="text-success font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> All valid — ready to publish</span>
                )}
              </div>

              {grouped(previewQuestions).map(([idx, qs]) => {
                const ch = previewLesson.chapters?.[idx];
                return (
                  <div key={idx} className="border border-border rounded-lg p-3 space-y-3">
                    <h4 className="font-semibold text-sm">Chapter {idx + 1}: {ch?.title || qs[0]?.chapter_title}</h4>
                    {qs.map((q, qi) => {
                      const isEditing = editingId === q.id;
                      const validationError = validateQuestion(q);
                      if (isEditing && editDraft) {
                        const draftError = validateQuestion(editDraft);
                        return (
                          <div key={q.id} className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
                            <Textarea
                              value={editDraft.question}
                              onChange={(e) => setEditDraft({ ...editDraft, question: e.target.value })}
                              placeholder="Question text"
                              rows={2}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {editDraft.options.map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`correct-${q.id}`}
                                    checked={editDraft.correct === oi}
                                    onChange={() => setEditDraft({ ...editDraft, correct: oi })}
                                    className="accent-primary"
                                  />
                                  <Input
                                    value={opt}
                                    onChange={(e) => {
                                      const next = [...editDraft.options];
                                      next[oi] = e.target.value;
                                      setEditDraft({ ...editDraft, options: next });
                                    }}
                                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              ))}
                            </div>
                            <Input
                              value={editDraft.explanation}
                              onChange={(e) => setEditDraft({ ...editDraft, explanation: e.target.value })}
                              placeholder="Explanation (optional)"
                              className="h-8 text-sm"
                            />
                            {draftError && (
                              <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {draftError}</p>
                            )}
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditDraft(null); }}>Cancel</Button>
                              <Button size="sm" onClick={saveEdit} disabled={savingEdit || !!draftError} className="gap-1.5">
                                {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={q.id} className={`text-sm space-y-1 pl-2 border-l-2 ${validationError ? "border-destructive" : "border-primary/30"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium">Q{qi + 1}. {q.question}</p>
                            <div className="flex gap-1 shrink-0">
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => startEdit(q)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => deleteQuestion(q)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <ul className="space-y-0.5">
                            {q.options.map((o, oi) => (
                              <li key={oi} className={oi === q.correct ? "text-success font-medium" : "text-muted-foreground"}>
                                {String.fromCharCode(65 + oi)}. {o} {oi === q.correct && "✓"}
                              </li>
                            ))}
                          </ul>
                          {q.explanation && <p className="text-xs text-muted-foreground italic">→ {q.explanation}</p>}
                          {validationError && (
                            <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {validationError}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {!previewQuestions.length && <p className="text-center text-sm text-muted-foreground">No questions yet.</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Regenerate confirm dialog */}
      <Dialog open={!!regenNote} onOpenChange={(o) => !o && setRegenNote(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><RotateCw className="h-5 w-5" /> Regenerate MCQs?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Current questions will be archived as a new version snapshot, then fresh chapter-wise MCQs will be generated from the latest YouTube data. You can roll back from the History panel.
            </p>
            <Textarea
              placeholder="Optional note — e.g. 'Updated after creator added a new chapter on RAG'"
              value={regenNote?.note || ""}
              onChange={(e) => setRegenNote((r) => r ? { ...r, note: e.target.value } : r)}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRegenNote(null)}>Cancel</Button>
            <Button onClick={() => {
              const target = lessons.find((x) => x.id === regenNote?.id);
              if (target) handleRegenerate(target);
            }} className="gap-1.5"><RotateCw className="h-4 w-4" /> Regenerate now</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version history dialog with rollback */}
      <Dialog open={!!historyLesson} onOpenChange={(o) => { if (!o) { setHistoryLesson(null); setVersions([]); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Version history — {historyLesson?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
              <span className="font-semibold">Current: v{historyLesson?.version || 1}</span>
              {historyLesson?.last_regenerated_at && <span className="text-muted-foreground"> · regenerated {new Date(historyLesson.last_regenerated_at).toLocaleString()}</span>}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by note, generator, version, or date (e.g. 'rag', 'admin', 'v2', '2026-04')…"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            {(() => {
              const q = historySearch.toLowerCase().trim();
              const filtered = versions.filter((v) => {
                if (!q) return true;
                const haystack = [
                  v.note || "",
                  v.generated_by || "",
                  `v${v.version}`,
                  new Date(v.generated_at).toLocaleString(),
                  new Date(v.generated_at).toISOString(),
                ].join(" ").toLowerCase();
                return haystack.includes(q);
              });
              if (versions.length === 0) {
                return <p className="text-sm text-muted-foreground text-center py-4">No previous versions yet. Each regenerate creates a snapshot.</p>;
              }
              if (filtered.length === 0) {
                return <p className="text-sm text-muted-foreground text-center py-4">No versions match "{historySearch}".</p>;
              }
              return filtered.map((v) => (
                <div key={v.id} className="border border-border rounded-lg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">v{v.version}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(v.generated_at).toLocaleString()} · by {v.generated_by || "—"} · {v.questions?.length || 0} questions · {v.chapters?.length || 0} chapters</span>
                      {v.note && <span className="text-xs italic text-muted-foreground">— {v.note}</span>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={rollingBackId === v.id || !v.questions?.length || !isAdmin || historyLesson?.generation_status === "running"}
                      title={
                        !isAdmin
                          ? "Requires the Admin role. Coordinators can review version history but cannot rollback."
                          : historyLesson?.generation_status === "running"
                            ? "Disabled while this lesson is regenerating — wait for the job to finish."
                            : !v.questions?.length
                              ? "This snapshot has no saved questions to restore."
                              : undefined
                      }
                      onClick={() => rollbackToVersion(v)}
                    >
                      {rollingBackId === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                      Republish this version
                    </Button>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">Show questions</summary>
                    <div className="mt-2 pl-2 space-y-2 text-xs">
                      {(v.questions || []).slice(0, 12).map((q: any, i: number) => (
                        <div key={i} className="border-l-2 border-muted pl-2">
                          <p className="font-medium">Ch {(q.chapter_index ?? 0) + 1} · Q{(q.sort_order ?? 0) + 1}: {q.question}</p>
                          <p className="text-success">✓ {q.options?.[q.correct]}</p>
                        </div>
                      ))}
                      {(v.questions?.length || 0) > 12 && <p className="text-muted-foreground">+ {v.questions.length - 12} more</p>}
                    </div>
                  </details>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoMcqManager;
