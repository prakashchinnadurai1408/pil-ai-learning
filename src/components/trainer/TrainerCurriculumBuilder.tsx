import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Sparkles, Plus, Trash2, Loader2, RefreshCw, Users, BookOpen, Video, ListChecks, ClipboardCheck,
  History, Save, RotateCcw, CalendarDays,
} from "lucide-react";
import { SortableList } from "@/components/trainer/SortableList";

type Curriculum = { id: string; title: string; description: string; goal: string; status: string; owner_role: string; owner_id: string; owner_college: string; created_at: string };
type Subject = { id: string; curriculum_id: string; title: string; description: string; sort_order: number };
type Topic = { id: string; subject_id: string; title: string; description: string; sort_order: number };
type Subtopic = { id: string; topic_id: string; title: string; content: string; sort_order: number };
type Vid = { id: string; topic_id: string; title: string; description: string; youtube_query: string; youtube_id: string; duration: string; sort_order: number };
type Quiz = { id: string; topic_id: string; subtopic_id: string | null; title: string; questions: any[]; difficulty?: string; scope?: string };
type Assess = { id: string; curriculum_id: string; title: string; description: string; questions: any[]; passing_score: number; time_limit_minutes: number | null };
type Assignment = { id: string; curriculum_id: string; scope_type: string; college: string; department: string; degree: string; student_id: string | null; due_date: string | null; status: string; notes: string };
type Version = { id: string; curriculum_id: string; version_number: number; label: string; snapshot: any; created_by_name: string; is_published: boolean; created_at: string };

interface Props {
  ownerRole: "trainer" | "admin";
  ownerId: string;
  ownerName: string;
  ownerCollege: string;
}

export default function TrainerCurriculumBuilder({ ownerRole, ownerId, ownerName, ownerCollege }: Props) {
  const [list, setList] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Curriculum | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [genTitle, setGenTitle] = useState("");
  const [genGoal, setGenGoal] = useState("");
  const [genDesc, setGenDesc] = useState("");
  const [generating, setGenerating] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    let q = supabase.from("trainer_curricula").select("*").order("created_at", { ascending: false });
    if (ownerRole === "trainer") q = q.eq("owner_role", "trainer").eq("owner_id", ownerId);
    const { data } = await q;
    setList((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchList(); }, [ownerRole, ownerId]);

  const handleGenerate = async () => {
    if (!genTitle.trim() || !genGoal.trim()) { toast.error("Title and goal are required"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-trainer-curriculum", {
        body: {
          mode: "full",
          title: genTitle, goal: genGoal, description: genDesc,
          ownerRole, ownerId, ownerName, ownerCollege,
        },
      });
      if (error || !data?.ok) throw new Error(error?.message || data?.error || "AI generation failed");
      toast.success("Curriculum generated");
      setGenOpen(false);
      setGenTitle(""); setGenGoal(""); setGenDesc("");
      await fetchList();
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this curriculum and all its content?")) return;
    await supabase.from("trainer_curricula").delete().eq("id", id);
    if (selected?.id === id) setSelected(null);
    fetchList();
  };

  const togglePublish = async (c: Curriculum) => {
    const next = c.status === "published" ? "draft" : "published";
    await supabase.from("trainer_curricula").update({ status: next }).eq("id", c.id);
    toast.success(next === "published" ? "Published to students" : "Moved to draft");
    fetchList();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Curriculum Builder</h2>
          <p className="text-sm text-muted-foreground">
            Create AI-generated curricula (Subjects → Topics → Subtopics, Videos, Quizzes, Final Assessment) for your institute's students.
          </p>
        </div>
        <Button onClick={() => setGenOpen(true)} className="gap-2">
          <Sparkles className="h-4 w-4" /> Generate with AI
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">My Curricula</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {!loading && list.length === 0 && <p className="text-sm text-muted-foreground">No curricula yet. Click "Generate with AI" to create one.</p>}
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left p-3 rounded border transition ${selected?.id === c.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sm">{c.title}</div>
                  <Badge variant={c.status === "published" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge>
                </div>
                {c.owner_college && <div className="text-[11px] text-muted-foreground mt-1">{c.owner_college}</div>}
              </button>
            ))}
          </CardContent>
        </Card>

        <div>
          {selected ? (
            <CurriculumDetail
              curriculum={selected}
              onChanged={fetchList}
              onDelete={() => handleDelete(selected.id)}
              onTogglePublish={() => togglePublish(selected)}
              ownerCollege={ownerCollege}
              ownerName={ownerName}
              ownerId={ownerId}
            />
          ) : (
            <Card><CardContent className="p-10 text-center text-muted-foreground">Select a curriculum to view its tree, or generate a new one.</CardContent></Card>
          )}
        </div>
      </div>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Generate Curriculum from a Goal/JD</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Title</label>
              <Input value={genTitle} onChange={(e) => setGenTitle(e.target.value)} placeholder="e.g. Data Analyst Foundation" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description (optional)</label>
              <Input value={genDesc} onChange={(e) => setGenDesc(e.target.value)} placeholder="Short summary for students" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Goal / Job Description</label>
              <Textarea value={genGoal} onChange={(e) => setGenGoal(e.target.value)} placeholder="Paste the JD or describe the outcome students must achieve..." rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)} disabled={generating}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CurriculumDetail({ curriculum, onChanged, onDelete, onTogglePublish, ownerCollege, ownerName, ownerId }: {
  curriculum: Curriculum; onChanged: () => void; onDelete: () => void; onTogglePublish: () => void; ownerCollege: string; ownerName: string; ownerId: string;
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [videos, setVideos] = useState<Vid[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assessment, setAssessment] = useState<Assess | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const refresh = async () => {
    const cId = curriculum.id;
    const { data: sj } = await supabase.from("curriculum_subjects").select("*").eq("curriculum_id", cId).order("sort_order");
    const sjs = (sj as any[]) || [];
    setSubjects(sjs);
    const sjIds = sjs.map((s) => s.id);
    const { data: tp } = sjIds.length
      ? await supabase.from("curriculum_topics").select("*").in("subject_id", sjIds).order("sort_order")
      : { data: [] };
    const tps = (tp as any[]) || [];
    setTopics(tps);
    const tpIds = tps.map((t) => t.id);
    const [{ data: st }, { data: vd }, { data: qz }, { data: as }, { data: an }] = await Promise.all([
      tpIds.length ? supabase.from("curriculum_subtopics").select("*").in("topic_id", tpIds).order("sort_order") : Promise.resolve({ data: [] } as any),
      tpIds.length ? supabase.from("curriculum_videos").select("*").in("topic_id", tpIds).order("sort_order") : Promise.resolve({ data: [] } as any),
      tpIds.length ? supabase.from("curriculum_quizzes").select("*").in("topic_id", tpIds) : Promise.resolve({ data: [] } as any),
      supabase.from("curriculum_assessments").select("*").eq("curriculum_id", cId).maybeSingle(),
      supabase.from("curriculum_assignments").select("*").eq("curriculum_id", cId).order("created_at", { ascending: false }),
    ]);
    setSubtopics((st as any[]) || []);
    setVideos((vd as any[]) || []);
    setQuizzes((qz as any[]) || []);
    setAssessment((as as any) || null);
    setAssignments((an as any[]) || []);
  };

  useEffect(() => { refresh(); }, [curriculum.id]);

  const regen = async (nodeType: string, nodeId: string, context: string, extra: Record<string, any> = {}) => {
    setBusy(nodeId + ":" + nodeType);
    try {
      const { data, error } = await supabase.functions.invoke("generate-trainer-curriculum", {
        body: { mode: "regenerate", nodeType, nodeId, context, ...extra },
      });
      if (error || !data?.ok) throw new Error(error?.message || data?.error || "Failed");
      toast.success("Generated");
      await refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  // Reorder helpers — persist new sort_order to DB
  const persistOrder = async (table: string, items: { id: string }[]) => {
    await Promise.all(items.map((it, idx) =>
      supabase.from(table as any).update({ sort_order: idx }).eq("id", it.id),
    ));
  };

  const reorderSubjects = async (next: Subject[]) => {
    setSubjects(next.map((s, i) => ({ ...s, sort_order: i })));
    await persistOrder("curriculum_subjects", next);
  };
  const reorderTopics = async (subjectId: string, next: Topic[]) => {
    const others = topics.filter((t) => t.subject_id !== subjectId);
    setTopics([...others, ...next.map((t, i) => ({ ...t, sort_order: i }))]);
    await persistOrder("curriculum_topics", next);
  };
  const reorderSubtopics = async (topicId: string, next: Subtopic[]) => {
    const others = subtopics.filter((s) => s.topic_id !== topicId);
    setSubtopics([...others, ...next.map((s, i) => ({ ...s, sort_order: i }))]);
    await persistOrder("curriculum_subtopics", next);
  };
  const reorderVideos = async (topicId: string, next: Vid[]) => {
    const others = videos.filter((v) => v.topic_id !== topicId);
    setVideos([...others, ...next.map((v, i) => ({ ...v, sort_order: i }))]);
    await persistOrder("curriculum_videos", next);
  };

  // Snapshot the full curriculum tree (for version history)
  const saveVersion = async (label: string) => {
    const snapshot = { curriculum, subjects, topics, subtopics, videos, quizzes, assessment };
    const { data: latest } = await supabase
      .from("curriculum_versions").select("version_number")
      .eq("curriculum_id", curriculum.id).order("version_number", { ascending: false }).limit(1).maybeSingle();
    const next = ((latest as any)?.version_number || 0) + 1;
    await supabase.from("curriculum_versions").insert({
      curriculum_id: curriculum.id, version_number: next, label: label || `v${next}`,
      snapshot, created_by: ownerId, created_by_name: ownerName, is_published: curriculum.status === "published",
    });
    toast.success(`Saved version ${next}`);
  };

  const topicsBySubject = useMemo(() => {
    const m: Record<string, Topic[]> = {};
    topics.forEach((t) => { (m[t.subject_id] ||= []).push(t); });
    return m;
  }, [topics]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{curriculum.title}</CardTitle>
              {curriculum.description && <p className="text-sm text-muted-foreground mt-1">{curriculum.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)} className="gap-1"><Users className="h-3 w-3" /> Assign ({assignments.length})</Button>
              <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)} className="gap-1"><History className="h-3 w-3" /> History</Button>
              <Button size="sm" variant="outline" onClick={() => saveVersion("")} className="gap-1"><Save className="h-3 w-3" /> Save Version</Button>
              <Button size="sm" variant={curriculum.status === "published" ? "secondary" : "default"} onClick={onTogglePublish}>
                {curriculum.status === "published" ? "Unpublish" : "Publish"}
              </Button>
              <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <SortableList
        items={subjects}
        onReorder={reorderSubjects}
        renderItem={(s) => (
          <Accordion type="multiple" className="w-full">
            <AccordionItem value={s.id} className="border rounded-lg px-3">
              <AccordionTrigger className="text-base font-medium">
                <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {s.title}</div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pl-2">
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                <SortableList
                  items={topicsBySubject[s.id] || []}
                  onReorder={(next) => reorderTopics(s.id, next)}
                  renderItem={(t) => {
                    const tSubtopics = subtopics.filter((x) => x.topic_id === t.id);
                    const tVideos = videos.filter((v) => v.topic_id === t.id);
                    return (
                      <Card className="bg-muted/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{t.title}</CardTitle>
                          {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          {/* Subtopics — sortable */}
                          <SortableList
                            items={tSubtopics}
                            onReorder={(next) => reorderSubtopics(t.id, next)}
                            renderItem={(st) => {
                              const stQuiz = quizzes.find((q) => q.subtopic_id === st.id && q.scope === "subtopic");
                              const stAssess = quizzes.find((q) => q.subtopic_id === st.id && q.scope === "assessment");
                              return (
                                <div className="rounded border p-2 bg-background">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <strong className="text-xs">{st.title}</strong>
                                    <div className="flex items-center gap-1">
                                      <SubtopicGenButtons
                                        subtopicId={st.id}
                                        context={`${t.title}: ${st.title}`}
                                        busy={busy}
                                        regen={regen}
                                        existingQuiz={stQuiz}
                                        existingAssess={stAssess}
                                      />
                                      <Button size="sm" variant="ghost" disabled={busy === st.id + ":subtopic"} onClick={() => regen("subtopic", st.id, `${t.title}: ${st.title}`)}>
                                        {busy === st.id + ":subtopic" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-xs whitespace-pre-wrap text-muted-foreground">{st.content}</p>
                                  {(stQuiz || stAssess) && (
                                    <div className="mt-2 flex gap-2 flex-wrap">
                                      {stQuiz && <Badge variant="secondary" className="text-[10px]">Quiz · {(stQuiz.questions || []).length} Qs · {stQuiz.difficulty}</Badge>}
                                      {stAssess && <Badge variant="default" className="text-[10px]">Assessment · {(stAssess.questions || []).length} Qs · {stAssess.difficulty}</Badge>}
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          />

                          {/* Videos — sortable */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium flex items-center gap-1"><Video className="h-3 w-3" /> Videos</span>
                              <Button size="sm" variant="ghost" disabled={busy === t.id + ":videos"} onClick={() => regen("videos", t.id, t.title)}>
                                {busy === t.id + ":videos" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                              </Button>
                            </div>
                            <SortableList
                              items={tVideos}
                              onReorder={(next) => reorderVideos(t.id, next)}
                              renderItem={(v) => (
                                <div className="text-xs text-muted-foreground py-1">• {v.title} <span className="opacity-60">({v.duration || "—"})</span></div>
                              )}
                            />
                          </div>

                          {/* Topic-level quiz */}
                          {quizzes.filter((q) => q.topic_id === t.id && q.scope !== "subtopic" && q.scope !== "assessment").map((q) => (
                            <div key={q.id} className="rounded border p-2 bg-background">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium flex items-center gap-1"><ListChecks className="h-3 w-3" /> {q.title} ({(q.questions || []).length} Qs)</span>
                                <Button size="sm" variant="ghost" disabled={busy === q.id + ":quiz"} onClick={() => regen("quiz", q.id, t.title)}>
                                  {busy === q.id + ":quiz" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  }}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      />

      {assessment && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /> {assessment.title}</CardTitle>
              <Button size="sm" variant="ghost" disabled={busy === assessment.id + ":assessment"} onClick={() => regen("assessment", assessment.id, curriculum.title)}>
                {busy === assessment.id + ":assessment" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {assessment.description && <p>{assessment.description}</p>}
            <p className="mt-1">{(assessment.questions || []).length} questions • Passing {assessment.passing_score}%</p>
          </CardContent>
        </Card>
      )}

      <AssignAudienceDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        curriculumId={curriculum.id}
        ownerCollege={ownerCollege}
        assignments={assignments}
        onChanged={refresh}
      />

      <VersionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        curriculumId={curriculum.id}
        onRestored={refresh}
      />
    </div>
  );
}

function SubtopicGenButtons({ subtopicId, context, busy, regen, existingQuiz, existingAssess }: {
  subtopicId: string; context: string; busy: string | null;
  regen: (nodeType: string, nodeId: string, context: string, extra?: any) => Promise<void>;
  existingQuiz?: Quiz; existingAssess?: Quiz;
}) {
  const [open, setOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState<"subtopic_quiz" | "subtopic_assessment">("subtopic_quiz");

  const isBusy = busy === subtopicId + ":subtopic_quiz" || busy === subtopicId + ":subtopic_assessment";

  return (
    <>
      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1" onClick={() => setOpen(true)}>
        <Sparkles className="h-3 w-3" /> Quiz/Assess
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Generate for "{context.split(": ")[1]}"</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subtopic_quiz">Quiz (MCQs)</SelectItem>
                    <SelectItem value="subtopic_assessment">Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Difficulty</label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Number of questions ({count})</label>
              <Input type="number" min={3} max={15} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {mode === "subtopic_quiz" ? "MCQs with 4 options, single correct answer, and explanation as answer key." : "Mix of conceptual + applied MCQs scored as a graded assessment."}
            </p>
            {(existingQuiz && mode === "subtopic_quiz") && <p className="text-[11px] text-amber-600">Existing quiz ({existingQuiz.questions.length} Qs) will be replaced.</p>}
            {(existingAssess && mode === "subtopic_assessment") && <p className="text-[11px] text-amber-600">Existing assessment ({existingAssess.questions.length} Qs) will be replaced.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={isBusy}
              onClick={async () => {
                await regen(mode, subtopicId, context, { difficulty, count });
                setOpen(false);
              }}
              className="gap-1"
            >
              {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AssignAudienceDialog({ open, onOpenChange, curriculumId, ownerCollege, assignments, onChanged }: {
  open: boolean; onOpenChange: (b: boolean) => void; curriculumId: string; ownerCollege: string; assignments: Assignment[]; onChanged: () => void;
}) {
  const [scopeType, setScopeType] = useState<"cohort" | "student">("cohort");
  const [college, setCollege] = useState("");
  const [departments, setDepartments] = useState("");
  const [degrees, setDegrees] = useState("");
  const [studentMobiles, setStudentMobiles] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { if (open) setCollege(ownerCollege); }, [open, ownerCollege]);

  const add = async () => {
    const baseDue = dueDate || null;
    if (scopeType === "student") {
      const mobiles = studentMobiles.split(/[,\s]+/).map((m) => m.trim()).filter(Boolean);
      if (!mobiles.length) { toast.error("Enter one or more student mobile numbers"); return; }
      const { data: stus } = await supabase.from("students").select("id, mobile").in("mobile", mobiles);
      const found = (stus as any[]) || [];
      if (!found.length) { toast.error("No matching students found"); return; }
      const rows = found.map((s) => ({
        curriculum_id: curriculumId, scope_type: "student", student_id: s.id,
        college: "", department: "", degree: "", due_date: baseDue, status: "active", notes,
      }));
      await supabase.from("curriculum_assignments").insert(rows);
      const missing = mobiles.length - found.length;
      toast.success(`Assigned to ${found.length} student${found.length === 1 ? "" : "s"}${missing > 0 ? ` (${missing} not found)` : ""}`);
    } else {
      const depList = departments.split(",").map((d) => d.trim()).filter(Boolean);
      const degList = degrees.split(",").map((d) => d.trim()).filter(Boolean);
      // Cartesian product of dept × degree (or just one row if both empty)
      const combos: { dep: string; deg: string }[] = [];
      const ds = depList.length ? depList : [""];
      const gs = degList.length ? degList : [""];
      ds.forEach((dep) => gs.forEach((deg) => combos.push({ dep, deg })));
      const rows = combos.map((c) => ({
        curriculum_id: curriculumId, scope_type: "cohort",
        college: college.trim(), department: c.dep, degree: c.deg, student_id: null,
        due_date: baseDue, status: "active", notes,
      }));
      await supabase.from("curriculum_assignments").insert(rows);
      toast.success(`Added ${rows.length} cohort rule${rows.length === 1 ? "" : "s"}`);
    }
    setStudentMobiles(""); setNotes(""); setDueDate("");
    onChanged();
  };

  const remove = async (id: string) => {
    await supabase.from("curriculum_assignments").delete().eq("id", id);
    onChanged();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("curriculum_assignments").update({ status }).eq("id", id);
    onChanged();
  };

  const updateDue = async (id: string, due: string) => {
    await supabase.from("curriculum_assignments").update({ due_date: due || null }).eq("id", id);
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Assign Curriculum</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Default scope is your institute ({ownerCollege || "—"}). Add cohort rules (departments × degrees) or specific students with due dates and status.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={scopeType} onValueChange={(v) => setScopeType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cohort">Cohort (College/Dept/Degree)</SelectItem>
                <SelectItem value="student">Specific Students</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder="Due date" />
            </div>
          </div>
          {scopeType === "cohort" ? (
            <div className="space-y-2">
              <Input placeholder="College" value={college} onChange={(e) => setCollege(e.target.value)} />
              <Input placeholder="Departments (comma-separated, blank = any)" value={departments} onChange={(e) => setDepartments(e.target.value)} />
              <Input placeholder="Degrees (comma-separated, blank = any)" value={degrees} onChange={(e) => setDegrees(e.target.value)} />
            </div>
          ) : (
            <Textarea placeholder="Student mobile numbers (comma or newline separated)" rows={3} value={studentMobiles} onChange={(e) => setStudentMobiles(e.target.value)} />
          )}
          <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button onClick={add} className="gap-1 w-full"><Plus className="h-3 w-3" /> Add Assignment</Button>

          <div className="space-y-2 max-h-72 overflow-y-auto border-t pt-3">
            <div className="text-xs font-medium text-muted-foreground">Existing assignments ({assignments.length})</div>
            {assignments.length === 0 && <p className="text-xs text-muted-foreground">No rules yet — published curricula default to your institute.</p>}
            {assignments.map((a) => (
              <div key={a.id} className="border rounded p-2 text-xs space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium">
                      {a.scope_type === "student"
                        ? `Student ${(a.student_id || "").slice(0, 8)}`
                        : `${a.college || "any college"} • ${a.department || "any dept"} • ${a.degree || "any degree"}`}
                    </div>
                    {a.notes && <div className="text-muted-foreground mt-0.5">{a.notes}</div>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    type="date" value={a.due_date || ""} className="h-7 w-36 text-xs"
                    onChange={(e) => updateDue(a.id, e.target.value)}
                  />
                  <Select value={a.status || "active"} onValueChange={(v) => updateStatus(a.id, v)}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant={a.status === "active" ? "default" : "secondary"} className="text-[10px]">{a.status || "active"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VersionHistoryDialog({ open, onOpenChange, curriculumId, onRestored }: {
  open: boolean; onOpenChange: (b: boolean) => void; curriculumId: string; onRestored: () => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [diffPair, setDiffPair] = useState<{ a: Version; b: Version } | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchVersions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("curriculum_versions").select("*")
      .eq("curriculum_id", curriculumId).order("version_number", { ascending: false });
    setVersions((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (open) fetchVersions(); }, [open, curriculumId]);

  const summarize = (snap: any) => ({
    subjects: snap?.subjects?.length || 0,
    topics: snap?.topics?.length || 0,
    subtopics: snap?.subtopics?.length || 0,
    videos: snap?.videos?.length || 0,
    quizzes: snap?.quizzes?.length || 0,
    assessmentQs: snap?.assessment?.questions?.length || 0,
  });

  const restore = async (v: Version) => {
    if (!confirm(`Roll back to version ${v.version_number}? This replaces current content (a snapshot of the current state will be saved first).`)) return;
    setRestoring(v.id);
    try {
      // 1. Snapshot current state as a safety version
      const cur = await loadCurrentSnapshot(curriculumId);
      const { data: latest } = await supabase
        .from("curriculum_versions").select("version_number")
        .eq("curriculum_id", curriculumId).order("version_number", { ascending: false }).limit(1).maybeSingle();
      const nextN = ((latest as any)?.version_number || 0) + 1;
      await supabase.from("curriculum_versions").insert({
        curriculum_id: curriculumId, version_number: nextN,
        label: `Auto-snapshot before restore of v${v.version_number}`,
        snapshot: cur, created_by: "", created_by_name: "system", is_published: false,
      });

      // 2. Wipe child tables (assessments, quizzes, videos, subtopics, topics, subjects)
      const subjIds = (cur?.subjects || []).map((s: any) => s.id);
      const topIds = (cur?.topics || []).map((t: any) => t.id);
      if (topIds.length) {
        await supabase.from("curriculum_subtopics").delete().in("topic_id", topIds);
        await supabase.from("curriculum_videos").delete().in("topic_id", topIds);
        await supabase.from("curriculum_quizzes").delete().in("topic_id", topIds);
      }
      if (subjIds.length) await supabase.from("curriculum_topics").delete().in("subject_id", subjIds);
      await supabase.from("curriculum_subjects").delete().eq("curriculum_id", curriculumId);
      await supabase.from("curriculum_assessments").delete().eq("curriculum_id", curriculumId);

      // 3. Reinsert from snapshot
      const snap = v.snapshot || {};
      const subjects: any[] = snap.subjects || [];
      const topics: any[] = snap.topics || [];
      const subtopics: any[] = snap.subtopics || [];
      const videos: any[] = snap.videos || [];
      const quizzes: any[] = snap.quizzes || [];
      const assessment = snap.assessment;

      // Generate new IDs and remap parent references
      const subjMap: Record<string, string> = {};
      const topMap: Record<string, string> = {};
      const stMap: Record<string, string> = {};

      const newSubjects = subjects.map((s) => {
        const newId = crypto.randomUUID();
        subjMap[s.id] = newId;
        return { id: newId, curriculum_id: curriculumId, title: s.title, description: s.description || "", sort_order: s.sort_order || 0 };
      });
      if (newSubjects.length) await supabase.from("curriculum_subjects").insert(newSubjects);

      const newTopics = topics.map((t) => {
        const newId = crypto.randomUUID();
        topMap[t.id] = newId;
        return { id: newId, subject_id: subjMap[t.subject_id] || null, title: t.title, description: t.description || "", sort_order: t.sort_order || 0 };
      }).filter((t) => t.subject_id);
      if (newTopics.length) await supabase.from("curriculum_topics").insert(newTopics);

      const newSub = subtopics.map((s) => {
        const newId = crypto.randomUUID();
        stMap[s.id] = newId;
        return { id: newId, topic_id: topMap[s.topic_id] || null, title: s.title, content: s.content || "", sort_order: s.sort_order || 0 };
      }).filter((s) => s.topic_id);
      if (newSub.length) await supabase.from("curriculum_subtopics").insert(newSub);

      const newVids = videos.map((vd) => ({
        topic_id: topMap[vd.topic_id] || null, title: vd.title, description: vd.description || "",
        youtube_query: vd.youtube_query || "", youtube_id: vd.youtube_id || "",
        duration: vd.duration || "", sort_order: vd.sort_order || 0,
      })).filter((vd) => vd.topic_id);
      if (newVids.length) await supabase.from("curriculum_videos").insert(newVids);

      const newQz = quizzes.map((q) => ({
        topic_id: topMap[q.topic_id] || null,
        subtopic_id: q.subtopic_id ? (stMap[q.subtopic_id] || null) : null,
        title: q.title, questions: q.questions || [], difficulty: q.difficulty || "medium", scope: q.scope || "topic",
      })).filter((q) => q.topic_id);
      if (newQz.length) await supabase.from("curriculum_quizzes").insert(newQz);

      if (assessment) {
        await supabase.from("curriculum_assessments").insert({
          curriculum_id: curriculumId, title: assessment.title || "Final Assessment",
          description: assessment.description || "", questions: assessment.questions || [],
          passing_score: assessment.passing_score ?? 60, time_limit_minutes: assessment.time_limit_minutes ?? null,
        });
      }

      toast.success(`Restored to version ${v.version_number}`);
      await fetchVersions();
      onRestored();
    } catch (e: any) {
      toast.error(e.message || "Restore failed");
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Version History</DialogTitle></DialogHeader>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {versions.length === 0 && <p className="text-xs text-muted-foreground">No versions saved yet. Click "Save Version" in the curriculum header to snapshot the current state.</p>}
            {versions.map((v) => {
              const sum = summarize(v.snapshot);
              return (
                <div key={v.id} className="border rounded p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">v{v.version_number} {v.label && <span className="text-muted-foreground font-normal">— {v.label}</span>}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()} · by {v.created_by_name || "—"} {v.is_published && <Badge variant="default" className="text-[9px] ml-1">published</Badge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {sum.subjects} subjects · {sum.topics} topics · {sum.subtopics} subtopics · {sum.videos} videos · {sum.quizzes} quizzes · {sum.assessmentQs} final Qs
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm" variant="outline"
                        onClick={() => {
                          if (!diffPair) setDiffPair({ a: v, b: v });
                          else if (!diffPair.b || diffPair.a.id === diffPair.b.id) setDiffPair({ a: diffPair.a, b: v });
                          else setDiffPair({ a: v, b: diffPair.b });
                        }}
                      >
                        Compare
                      </Button>
                      <Button size="sm" variant="default" disabled={restoring === v.id} onClick={() => restore(v)} className="gap-1">
                        {restoring === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />} Restore
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {diffPair && diffPair.a.id !== diffPair.b.id && (
              <div className="border-t pt-3">
                <div className="text-xs font-medium mb-2">Compare v{diffPair.a.version_number} ↔ v{diffPair.b.version_number}</div>
                <DiffSummary a={diffPair.a} b={diffPair.b} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DiffSummary({ a, b }: { a: Version; b: Version }) {
  const sumA = {
    subjects: a.snapshot?.subjects?.length || 0,
    topics: a.snapshot?.topics?.length || 0,
    subtopics: a.snapshot?.subtopics?.length || 0,
    videos: a.snapshot?.videos?.length || 0,
    quizzes: a.snapshot?.quizzes?.length || 0,
  };
  const sumB = {
    subjects: b.snapshot?.subjects?.length || 0,
    topics: b.snapshot?.topics?.length || 0,
    subtopics: b.snapshot?.subtopics?.length || 0,
    videos: b.snapshot?.videos?.length || 0,
    quizzes: b.snapshot?.quizzes?.length || 0,
  };
  const rows: [string, number, number][] = [
    ["Subjects", sumA.subjects, sumB.subjects],
    ["Topics", sumA.topics, sumB.topics],
    ["Subtopics", sumA.subtopics, sumB.subtopics],
    ["Videos", sumA.videos, sumB.videos],
    ["Quizzes", sumA.quizzes, sumB.quizzes],
  ];
  return (
    <table className="w-full text-xs">
      <thead><tr className="text-muted-foreground"><th className="text-left">Item</th><th>v{a.version_number}</th><th>v{b.version_number}</th><th>Δ</th></tr></thead>
      <tbody>
        {rows.map(([label, av, bv]) => {
          const delta = bv - av;
          return (
            <tr key={label} className="border-t">
              <td className="py-1">{label}</td>
              <td className="text-center">{av}</td>
              <td className="text-center">{bv}</td>
              <td className={`text-center font-medium ${delta > 0 ? "text-green-600" : delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {delta > 0 ? `+${delta}` : delta}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

async function loadCurrentSnapshot(cId: string) {
  const { data: curriculum } = await supabase.from("trainer_curricula").select("*").eq("id", cId).maybeSingle();
  const { data: subjects } = await supabase.from("curriculum_subjects").select("*").eq("curriculum_id", cId).order("sort_order");
  const sjIds = (subjects || []).map((s: any) => s.id);
  const { data: topics } = sjIds.length
    ? await supabase.from("curriculum_topics").select("*").in("subject_id", sjIds).order("sort_order")
    : { data: [] as any[] };
  const tpIds = (topics || []).map((t: any) => t.id);
  const [{ data: subtopics }, { data: videos }, { data: quizzes }, { data: assessment }] = await Promise.all([
    tpIds.length ? supabase.from("curriculum_subtopics").select("*").in("topic_id", tpIds).order("sort_order") : Promise.resolve({ data: [] } as any),
    tpIds.length ? supabase.from("curriculum_videos").select("*").in("topic_id", tpIds).order("sort_order") : Promise.resolve({ data: [] } as any),
    tpIds.length ? supabase.from("curriculum_quizzes").select("*").in("topic_id", tpIds) : Promise.resolve({ data: [] } as any),
    supabase.from("curriculum_assessments").select("*").eq("curriculum_id", cId).maybeSingle(),
  ]);
  return { curriculum, subjects: subjects || [], topics: topics || [], subtopics: subtopics || [], videos: videos || [], quizzes: quizzes || [], assessment };
}
