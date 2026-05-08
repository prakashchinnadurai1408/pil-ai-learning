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
import { Sparkles, Plus, Trash2, Loader2, RefreshCw, Users, BookOpen, Video, ListChecks, ClipboardCheck } from "lucide-react";

type Curriculum = { id: string; title: string; description: string; goal: string; status: string; owner_role: string; owner_id: string; owner_college: string; created_at: string };
type Subject = { id: string; curriculum_id: string; title: string; description: string; sort_order: number };
type Topic = { id: string; subject_id: string; title: string; description: string; sort_order: number };
type Subtopic = { id: string; topic_id: string; title: string; content: string; sort_order: number };
type Vid = { id: string; topic_id: string; title: string; description: string; youtube_query: string; youtube_id: string; duration: string };
type Quiz = { id: string; topic_id: string; title: string; questions: any[] };
type Assess = { id: string; curriculum_id: string; title: string; description: string; questions: any[]; passing_score: number; time_limit_minutes: number | null };
type Assignment = { id: string; curriculum_id: string; scope_type: string; college: string; department: string; degree: string; student_id: string | null };

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

function CurriculumDetail({ curriculum, onChanged, onDelete, onTogglePublish, ownerCollege }: {
  curriculum: Curriculum; onChanged: () => void; onDelete: () => void; onTogglePublish: () => void; ownerCollege: string;
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
      supabase.from("curriculum_assignments").select("*").eq("curriculum_id", cId),
    ]);
    setSubtopics((st as any[]) || []);
    setVideos((vd as any[]) || []);
    setQuizzes((qz as any[]) || []);
    setAssessment((as as any) || null);
    setAssignments((an as any[]) || []);
  };

  useEffect(() => { refresh(); }, [curriculum.id]);

  const regen = async (nodeType: string, nodeId: string, context: string) => {
    setBusy(nodeId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-trainer-curriculum", {
        body: { mode: "regenerate", nodeType, nodeId, context },
      });
      if (error || !data?.ok) throw new Error(error?.message || data?.error || "Failed");
      toast.success("Regenerated");
      await refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
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
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)} className="gap-1"><Users className="h-3 w-3" /> Audience ({assignments.length})</Button>
              <Button size="sm" variant={curriculum.status === "published" ? "secondary" : "default"} onClick={onTogglePublish}>
                {curriculum.status === "published" ? "Unpublish" : "Publish"}
              </Button>
              <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Accordion type="multiple" className="space-y-2">
        {subjects.map((s) => (
          <AccordionItem key={s.id} value={s.id} className="border rounded-lg px-3">
            <AccordionTrigger className="text-base font-medium">
              <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {s.title}</div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pl-2">
              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              {(topicsBySubject[s.id] || []).map((t) => (
                <Card key={t.id} className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t.title}</CardTitle>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {/* Subtopics */}
                    {subtopics.filter((x) => x.topic_id === t.id).map((st) => (
                      <div key={st.id} className="rounded border p-2 bg-background">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <strong className="text-xs">{st.title}</strong>
                          <Button size="sm" variant="ghost" disabled={busy === st.id} onClick={() => regen("subtopic", st.id, `${t.title}: ${st.title}`)}>
                            {busy === st.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          </Button>
                        </div>
                        <p className="text-xs whitespace-pre-wrap text-muted-foreground">{st.content}</p>
                      </div>
                    ))}
                    {/* Videos */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium flex items-center gap-1"><Video className="h-3 w-3" /> Videos</span>
                        <Button size="sm" variant="ghost" disabled={busy === t.id + ":v"} onClick={() => { setBusy(t.id + ":v"); regen("videos", t.id, t.title).finally(() => setBusy(null)); }}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                      <ul className="space-y-1">
                        {videos.filter((v) => v.topic_id === t.id).map((v) => (
                          <li key={v.id} className="text-xs text-muted-foreground">• {v.title} <span className="opacity-60">({v.duration || "—"})</span></li>
                        ))}
                      </ul>
                    </div>
                    {/* Quiz */}
                    {quizzes.filter((q) => q.topic_id === t.id).map((q) => (
                      <div key={q.id} className="rounded border p-2 bg-background">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium flex items-center gap-1"><ListChecks className="h-3 w-3" /> {q.title} ({(q.questions || []).length} Qs)</span>
                          <Button size="sm" variant="ghost" disabled={busy === q.id} onClick={() => regen("quiz", q.id, t.title)}>
                            {busy === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {assessment && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /> {assessment.title}</CardTitle>
              <Button size="sm" variant="ghost" disabled={busy === assessment.id} onClick={() => regen("assessment", assessment.id, curriculum.title)}>
                {busy === assessment.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
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
    </div>
  );
}

function AssignAudienceDialog({ open, onOpenChange, curriculumId, ownerCollege, assignments, onChanged }: {
  open: boolean; onOpenChange: (b: boolean) => void; curriculumId: string; ownerCollege: string; assignments: Assignment[]; onChanged: () => void;
}) {
  const [scopeType, setScopeType] = useState<"cohort" | "student">("cohort");
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [degree, setDegree] = useState("");
  const [studentMobile, setStudentMobile] = useState("");

  useEffect(() => { if (open) setCollege(ownerCollege); }, [open, ownerCollege]);

  const add = async () => {
    if (scopeType === "student") {
      if (!studentMobile.trim()) { toast.error("Enter a student mobile"); return; }
      const { data: stu } = await supabase.from("students").select("id").eq("mobile", studentMobile.trim()).maybeSingle();
      if (!stu) { toast.error("Student not found"); return; }
      await supabase.from("curriculum_assignments").insert({
        curriculum_id: curriculumId, scope_type: "student", student_id: (stu as any).id,
        college: "", department: "", degree: "",
      });
    } else {
      await supabase.from("curriculum_assignments").insert({
        curriculum_id: curriculumId, scope_type: "cohort",
        college: college.trim(), department: department.trim(), degree: degree.trim(), student_id: null,
      });
    }
    setStudentMobile("");
    onChanged();
    toast.success("Assignment added");
  };

  const remove = async (id: string) => {
    await supabase.from("curriculum_assignments").delete().eq("id", id);
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Curriculum Audience</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">Default scope is your institute ({ownerCollege || "—"}). Add cohort or specific student rules below.</div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={scopeType} onValueChange={(v) => setScopeType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cohort">Cohort</SelectItem>
                <SelectItem value="student">Specific Student</SelectItem>
              </SelectContent>
            </Select>
            {scopeType === "student" ? (
              <Input placeholder="Student mobile" value={studentMobile} onChange={(e) => setStudentMobile(e.target.value)} />
            ) : <div />}
          </div>
          {scopeType === "cohort" && (
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="College" value={college} onChange={(e) => setCollege(e.target.value)} />
              <Input placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
              <Input placeholder="Degree" value={degree} onChange={(e) => setDegree(e.target.value)} />
            </div>
          )}
          <Button onClick={add} className="gap-1 w-full"><Plus className="h-3 w-3" /> Add Rule</Button>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {assignments.length === 0 && <p className="text-xs text-muted-foreground">No rules yet — published curricula default to your institute.</p>}
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs border rounded px-2 py-1">
                <span>
                  {a.scope_type === "student"
                    ? `Student ${(a.student_id || "").slice(0, 8)}`
                    : `${a.college || "any college"} • ${a.department || "any dept"} • ${a.degree || "any degree"}`}
                </span>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
