import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Youtube, Sparkles, Trash2, Eye, RefreshCw, Plus, CheckCircle2, AlertTriangle, ListTodo, History, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { useAdminModules } from "@/hooks/useAdminModules";

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

const VideoMcqManager = () => {
  const { adminModules } = useAdminModules();
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ youtubeUrl: "", title: "", moduleId: "" });
  const [previewLesson, setPreviewLesson] = useState<VideoLesson | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<LessonQuestion[]>([]);
  const [historyLesson, setHistoryLesson] = useState<VideoLesson | null>(null);
  const [versions, setVersions] = useState<LessonVersion[]>([]);
  const [regenNote, setRegenNote] = useState<{ id: string; note: string } | null>(null);
  const pollRef = useRef<number | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("video_lessons").select("*").order("created_at", { ascending: false });
    setLessons((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); return () => { if (pollRef.current) window.clearInterval(pollRef.current); }; }, []);

  // Auto-poll while any lesson is in 'running'
  useEffect(() => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    if (lessons.some((l) => l.generation_status === "running")) {
      pollRef.current = window.setInterval(load, 4000);
    }
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [lessons]);

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
      const msg = (data as any)?.error || error?.message || "Generation failed";
      toast.error(msg);
    } else {
      toast.success(`Generated ${(data as any).questionCount} questions across ${(data as any).chapterCount} chapters.`);
      setForm({ youtubeUrl: "", title: "", moduleId: "" });
    }
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lesson and all its generated questions?")) return;
    const { error } = await supabase.from("video_lessons").delete().eq("id", id);
    if (error) { toast.error("Could not delete"); return; }
    toast.success("Lesson deleted");
    load();
  };

  const handlePublish = async (l: VideoLesson) => {
    const next = l.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("video_lessons").update({ status: next }).eq("id", l.id);
    if (error) { toast.error("Update failed"); return; }
    toast.success(`Lesson set to ${next}`);
    load();
  };

  const handleRegenerate = async (l: VideoLesson) => {
    const note = regenNote?.id === l.id ? regenNote.note.trim() : "";
    setRegenNote(null);
    toast.info(`Regenerating MCQs for "${l.title}"… (v${(l.version || 1) + 1})`);
    const { data, error } = await supabase.functions.invoke("generate-video-mcqs", {
      body: {
        youtubeUrl: l.youtube_url,
        regenerateLessonId: l.id,
        createdBy: "admin",
        note,
      },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Regeneration failed");
    } else {
      toast.success(`Regenerated to v${(data as any).version}: ${(data as any).questionCount} new questions.`);
    }
    load();
  };

  const openHistory = async (l: VideoLesson) => {
    setHistoryLesson(l);
    const { data } = await supabase
      .from("video_lesson_versions")
      .select("*")
      .eq("lesson_id", l.id)
      .order("version", { ascending: false });
    setVersions((data ?? []) as any);
  };

  const openPreview = async (l: VideoLesson) => {
    setPreviewLesson(l);
    const { data } = await supabase.from("video_lesson_questions").select("*").eq("lesson_id", l.id).order("chapter_index").order("sort_order");
    setPreviewQuestions((data ?? []) as any);
  };

  const grouped = (qs: LessonQuestion[]) => {
    const map = new Map<number, LessonQuestion[]>();
    for (const q of qs) {
      const arr = map.get(q.chapter_index) ?? [];
      arr.push(q); map.set(q.chapter_index, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Youtube className="h-6 w-6 text-destructive" /> Video Lessons → Auto-MCQs
        </h2>
        <p className="text-muted-foreground text-sm">Paste a YouTube URL — chapters are detected and chapter-wise multiple-choice questions are generated automatically.</p>
      </div>

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
              {lessons.map((l) => (
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
                    <p className="text-xs text-muted-foreground">{l.chapters?.length || 0} chapters · {Math.round((l.duration_seconds || 0) / 60)} min</p>
                    {l.last_regenerated_at && <p className="text-xs text-muted-foreground">Last regenerated {new Date(l.last_regenerated_at).toLocaleString()}</p>}
                    {l.generation_error && <p className="text-xs text-destructive">{l.generation_error}</p>}
                  </div>
                  <div className="flex gap-2 sm:flex-col">
                    <Button size="sm" variant="outline" onClick={() => openPreview(l)} className="gap-1.5"><Eye className="h-4 w-4" /> Preview</Button>
                    <Button size="sm" variant="outline" onClick={() => setRegenNote({ id: l.id, note: "" })} disabled={l.generation_status === "running"} className="gap-1.5">
                      <RotateCw className="h-4 w-4" /> Regenerate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openHistory(l)} className="gap-1.5"><History className="h-4 w-4" /> History</Button>
                    <Button size="sm" variant="outline" onClick={() => handlePublish(l)} disabled={l.generation_status !== "success"}>
                      {l.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(l.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewLesson} onOpenChange={(o) => !o && setPreviewLesson(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5" /> {previewLesson?.title}</DialogTitle></DialogHeader>
          {previewLesson && (
            <div className="space-y-4">
              <div className="aspect-video w-full">
                <iframe className="w-full h-full rounded" src={`https://www.youtube.com/embed/${previewLesson.youtube_video_id}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
              {grouped(previewQuestions).map(([idx, qs]) => {
                const ch = previewLesson.chapters?.[idx];
                return (
                  <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                    <h4 className="font-semibold text-sm">Chapter {idx + 1}: {ch?.title || qs[0]?.chapter_title}</h4>
                    {qs.map((q, qi) => (
                      <div key={q.id} className="text-sm space-y-1 pl-2 border-l-2 border-primary/30">
                        <p className="font-medium">Q{qi + 1}. {q.question}</p>
                        <ul className="space-y-0.5">
                          {q.options.map((o, oi) => (
                            <li key={oi} className={oi === q.correct ? "text-success font-medium" : "text-muted-foreground"}>
                              {String.fromCharCode(65 + oi)}. {o} {oi === q.correct && "✓"}
                            </li>
                          ))}
                        </ul>
                        {q.explanation && <p className="text-xs text-muted-foreground italic">→ {q.explanation}</p>}
                      </div>
                    ))}
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

      {/* Version history dialog */}
      <Dialog open={!!historyLesson} onOpenChange={(o) => { if (!o) { setHistoryLesson(null); setVersions([]); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Version history — {historyLesson?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
              <span className="font-semibold">Current: v{historyLesson?.version || 1}</span>
              {historyLesson?.last_regenerated_at && <span className="text-muted-foreground"> · regenerated {new Date(historyLesson.last_regenerated_at).toLocaleString()}</span>}
            </div>
            {versions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No previous versions yet. Each regenerate creates a snapshot.</p>}
            {versions.map((v) => (
              <details key={v.id} className="border border-border rounded-lg p-3">
                <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline">v{v.version}</Badge>
                  <span className="text-muted-foreground">{new Date(v.generated_at).toLocaleString()} · {v.questions?.length || 0} questions</span>
                  {v.note && <span className="text-xs italic text-muted-foreground">— {v.note}</span>}
                </summary>
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
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoMcqManager;
