import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BookOpen, Video, ListChecks, ClipboardCheck, Sparkles, Upload, CheckCircle2, Clock, AlertTriangle, MessageSquare, Filter, History as HistoryIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import SubmissionHistoryDialog from "@/components/trainer/SubmissionHistoryDialog";

interface Props {
  studentId: string;
  studentName?: string;
  college: string;
  department: string;
  degree: string;
}

type Submission = {
  id: string;
  curriculum_id: string;
  status: string;
  attachment_url: string;
  attachment_name: string;
  notes: string;
  trainer_feedback: string;
  score: number | null;
  reviewed_at: string | null;
  updated_at: string;
  revision_message?: string;
  revision_due_date?: string | null;
};

type CurriculumItem = {
  c: any;
  subjects: any[];
  topics: any[];
  subtopics: any[];
  videos: any[];
  quizzes: any[];
  assessment: any;
  assignment: any | null; // most relevant assignment for this student
  submission: Submission | null;
};

function statusFor(item: CurriculumItem) {
  const s = item.submission;
  const due = item.assignment?.due_date ? new Date(item.assignment.due_date) : null;
  const now = new Date();
  if (s) {
    if (s.status === "reviewed") return { key: "reviewed", label: "Reviewed", color: "bg-success/10 text-success border-success/30", icon: CheckCircle2 };
    if (s.status === "returned") return { key: "returned", label: "Returned", color: "bg-warning/10 text-warning border-warning/30", icon: AlertTriangle };
    return { key: "submitted", label: "Submitted", color: "bg-primary/10 text-primary border-primary/30", icon: CheckCircle2 };
  }
  if (due && due < now) return { key: "overdue", label: "Overdue", color: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle };
  return { key: "pending", label: "Pending", color: "bg-muted text-muted-foreground border-border", icon: Clock };
}

export default function MyTrainerCurricula({ studentId, studentName, college, department, degree }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<{ title: string; questions: any[] } | null>(null);
  const [groupBy, setGroupBy] = useState<"none" | "department" | "degree" | "due">("none");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [submissionDialog, setSubmissionDialog] = useState<{ item: CurriculumItem } | null>(null);
  const [historyFor, setHistoryFor] = useState<Submission | null>(null);

  const reload = async () => {
    setLoading(true);
    const [{ data: cur }, { data: assigns }] = await Promise.all([
      supabase.from("trainer_curricula").select("*").eq("status", "published"),
      supabase.from("curriculum_assignments").select("*"),
    ]);
    const curricula = (cur as any[]) || [];
    const A = (assigns as any[]) || [];
    const lc = (s: string | null | undefined) => (s || "").toLowerCase();

    const visiblePairs = curricula.flatMap((c: any) => {
      const rules = A.filter((a) => a.curriculum_id === c.id);
      if (rules.length === 0) {
        if (c.owner_college && lc(c.owner_college) === lc(college)) return [{ c, assignment: null }];
        return [];
      }
      const matching = rules.filter((a) => {
        if (a.scope_type === "student") return a.student_id === studentId;
        const okC = !a.college || lc(a.college) === lc(college);
        const okD = !a.department || lc(a.department) === lc(department);
        const okG = !a.degree || lc(a.degree) === lc(degree);
        return okC && okD && okG;
      });
      if (matching.length === 0) return [];
      // pick the most relevant assignment: earliest due date, then most specific scope
      const best = matching.sort((a, b) => {
        const da = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      })[0];
      return [{ c, assignment: best }];
    });

    const cIds = visiblePairs.map((p) => p.c.id);
    const { data: subsRaw } = cIds.length
      ? await supabase.from("curriculum_submissions").select("*").eq("student_id", studentId).in("curriculum_id", cIds)
      : ({ data: [] } as any);
    const subs = (subsRaw as Submission[]) || [];

    const detailed = await Promise.all(visiblePairs.map(async ({ c, assignment }) => {
      const { data: subjs } = await supabase.from("curriculum_subjects").select("*").eq("curriculum_id", c.id).order("sort_order");
      const subjects = (subjs as any[]) || [];
      const sIds = subjects.map((s) => s.id);
      const { data: tps } = sIds.length
        ? await supabase.from("curriculum_topics").select("*").in("subject_id", sIds).order("sort_order")
        : ({ data: [] } as any);
      const topics = (tps as any[]) || [];
      const tIds = topics.map((t) => t.id);
      const [{ data: stp }, { data: vds }, { data: qzs }, { data: ass }] = await Promise.all([
        tIds.length ? supabase.from("curriculum_subtopics").select("*").in("topic_id", tIds).order("sort_order") : Promise.resolve({ data: [] } as any),
        tIds.length ? supabase.from("curriculum_videos").select("*").in("topic_id", tIds).order("sort_order") : Promise.resolve({ data: [] } as any),
        tIds.length ? supabase.from("curriculum_quizzes").select("*").in("topic_id", tIds) : Promise.resolve({ data: [] } as any),
        supabase.from("curriculum_assessments").select("*").eq("curriculum_id", c.id).maybeSingle(),
      ]);
      const submission = subs.find((s) => s.curriculum_id === c.id && !s["assessment_id" as keyof Submission]) || null;
      return { c, subjects, topics, subtopics: (stp as any[]) || [], videos: (vds as any[]) || [], quizzes: (qzs as any[]) || [], assessment: ass as any, assignment, submission };
    }));

    setItems(detailed);
    setLoading(false);
  };

  useEffect(() => { if (studentId) reload(); }, [studentId, college, department, degree]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((it) => statusFor(it).key === statusFilter);
  }, [items, statusFilter]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ label: "All Curricula", entries: filtered }];
    const map = new Map<string, CurriculumItem[]>();
    for (const it of filtered) {
      let key = "Unspecified";
      if (groupBy === "department") key = it.assignment?.department || "Default (Institute-wide)";
      else if (groupBy === "degree") key = it.assignment?.degree || "Default (Institute-wide)";
      else if (groupBy === "due") {
        const d = it.assignment?.due_date;
        if (!d) key = "No due date";
        else {
          const dt = new Date(d);
          const now = new Date();
          const diff = (dt.getTime() - now.getTime()) / 86400000;
          if (diff < 0) key = "Overdue";
          else if (diff < 7) key = "Due this week";
          else if (diff < 30) key = "Due this month";
          else key = "Due later";
        }
      }
      map.set(key, [...(map.get(key) || []), it]);
    }
    return Array.from(map.entries()).map(([label, entries]) => ({ label, entries }));
  }, [filtered, groupBy]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No trainer curricula assigned yet. Your trainer can publish one for your institute.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">My Trainer Curricula</h2>
          <p className="text-sm text-muted-foreground">Custom learning paths created by your trainer for {college || "your institute"}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Group by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No grouping</SelectItem>
              <SelectItem value="department">By department</SelectItem>
              <SelectItem value="degree">By degree</SelectItem>
              <SelectItem value="due">By due date</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.label} className="space-y-3">
          {groupBy !== "none" && (
            <div className="flex items-center gap-2 pt-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</h3>
              <Badge variant="outline" className="text-[10px]">{g.entries.length}</Badge>
            </div>
          )}
          {g.entries.map((item) => {
            const { c, subjects, topics, subtopics, videos, quizzes, assessment, assignment, submission } = item;
            const st = statusFor(item);
            const Icon = st.icon;
            return (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">{c.title}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`gap-1 ${st.color}`}><Icon className="h-3 w-3" />{st.label}</Badge>
                      {assignment?.due_date && (
                        <Badge variant="outline" className="text-[11px]">Due {new Date(assignment.due_date).toLocaleDateString()}</Badge>
                      )}
                      {assignment?.department && <Badge variant="outline" className="text-[11px]">Dept: {assignment.department}</Badge>}
                      {assignment?.degree && <Badge variant="outline" className="text-[11px]">{assignment.degree}</Badge>}
                      <Badge variant="outline">{c.owner_name || "Trainer"}</Badge>
                    </div>
                  </CardTitle>
                  {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                  {(submission?.trainer_feedback || submission?.revision_message) && (
                    <div className={`mt-2 rounded border-l-4 p-2 text-xs ${submission.status === "returned" ? "border-warning bg-warning/10" : "border-primary bg-primary/5"}`}>
                      <div className="font-medium flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {submission.status === "returned" ? "Returned for revision — please resubmit" : "Trainer feedback"}
                      </div>
                      {submission.revision_message && (
                        <p className="mt-1 whitespace-pre-wrap text-foreground"><span className="font-medium">What to change: </span>{submission.revision_message}</p>
                      )}
                      {submission.trainer_feedback && (
                        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{submission.trainer_feedback}</p>
                      )}
                      {submission.revision_due_date && submission.status === "returned" && (
                        <p className="mt-1 text-warning font-medium">Revision due {new Date(submission.revision_due_date).toLocaleDateString()}</p>
                      )}
                      {submission.score != null && <div className="mt-1 text-primary font-semibold">Score: {submission.score}</div>}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="space-y-2">
                    {subjects.map((s: any) => (
                      <AccordionItem key={s.id} value={s.id} className="border rounded-lg px-3">
                        <AccordionTrigger className="text-base font-medium">
                          <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {s.title}</div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pl-2">
                          {topics.filter((t: any) => t.subject_id === s.id).map((t: any) => (
                            <div key={t.id} className="rounded border p-3 bg-muted/20 space-y-2">
                              <div className="font-medium text-sm">{t.title}</div>
                              {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                              {subtopics.filter((x: any) => x.topic_id === t.id).map((st2: any) => (
                                <div key={st2.id} className="rounded border p-2 bg-background">
                                  <div className="text-xs font-semibold mb-1">{st2.title}</div>
                                  <p className="text-xs whitespace-pre-wrap text-muted-foreground">{st2.content}</p>
                                </div>
                              ))}
                              {videos.filter((v: any) => v.topic_id === t.id).map((v: any) => (
                                <a key={v.id} href={v.youtube_id ? `https://youtube.com/watch?v=${v.youtube_id}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(v.youtube_query || v.title)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-primary hover:underline">
                                  <Video className="h-3 w-3" /> {v.title} {v.duration && <span className="opacity-60">({v.duration})</span>}
                                </a>
                              ))}
                              {quizzes.filter((q: any) => q.topic_id === t.id).map((q: any) => (
                                <Button key={q.id} variant="outline" size="sm" className="gap-1" onClick={() => setActiveQuiz({ title: q.title, questions: q.questions || [] })}>
                                  <ListChecks className="h-3 w-3" /> Take Quiz ({(q.questions || []).length} Qs)
                                </Button>
                              ))}
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {assessment && (
                    <div className="mt-4 rounded border p-3 bg-primary/5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /> {assessment.title}</div>
                        <div className="text-xs text-muted-foreground">{(assessment.questions || []).length} questions • Passing {assessment.passing_score}%</div>
                      </div>
                      <Button size="sm" onClick={() => setActiveQuiz({ title: assessment.title, questions: assessment.questions || [] })}>Start Assessment</Button>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <div className="text-xs text-muted-foreground">
                      {submission ? (
                        <>Submitted {new Date(submission.updated_at).toLocaleString()}{submission.attachment_name && <> • <a className="text-primary hover:underline" href={submission.attachment_url} target="_blank" rel="noreferrer">{submission.attachment_name}</a></>}</>
                      ) : (
                        <>No submission yet</>
                      )}
                    </div>
                    <Button size="sm" variant={submission?.status === "returned" ? "default" : (submission ? "outline" : "default")} className="gap-1" onClick={() => setSubmissionDialog({ item })}>
                      <Upload className="h-3 w-3" /> {submission?.status === "returned" ? "Resubmit work" : (submission ? "Update submission" : "Submit work")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      <QuizRunner open={!!activeQuiz} onOpenChange={(b) => !b && setActiveQuiz(null)} quiz={activeQuiz} />
      <SubmissionDialog
        open={!!submissionDialog}
        onOpenChange={(b) => !b && setSubmissionDialog(null)}
        item={submissionDialog?.item || null}
        studentId={studentId}
        studentName={studentName || ""}
        college={college}
        department={department}
        degree={degree}
        onSaved={async () => { setSubmissionDialog(null); await reload(); }}
      />
    </div>
  );
}

function SubmissionDialog({ open, onOpenChange, item, studentId, studentName, college, department, degree, onSaved }: {
  open: boolean; onOpenChange: (b: boolean) => void; item: CurriculumItem | null;
  studentId: string; studentName: string; college: string; department: string; degree: string; onSaved: () => void | Promise<void>;
}) {
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState<"idle" | "uploading" | "saving" | "done">("idle");

  useEffect(() => {
    if (open && item) {
      setNotes(item.submission?.notes || "");
      setFile(null);
      setStage("idle");
    }
  }, [open, item]);

  if (!item) return null;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      let attachment_url = item.submission?.attachment_url || "";
      let attachment_name = item.submission?.attachment_name || "";
      if (file) {
        if (file.size > 20 * 1024 * 1024) throw new Error("File exceeds 20MB limit");
        setStage("uploading");
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `curriculum-submissions/${item.c.id}/${studentId}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage.from("assessment-uploads").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("assessment-uploads").getPublicUrl(path);
        attachment_url = pub.publicUrl;
        attachment_name = file.name;
      }
      setStage("saving");
      const payload: any = {
        curriculum_id: item.c.id,
        student_id: studentId,
        student_name: studentName,
        student_college: college,
        student_department: department,
        student_degree: degree,
        attachment_url, attachment_name,
        notes,
        status: "submitted",
      };
      if (item.submission) {
        const { error } = await supabase.from("curriculum_submissions").update(payload).eq("id", item.submission.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("curriculum_submissions").insert(payload);
        if (error) throw error;
      }
      setStage("done");
      toast.success("Submission saved");
      await onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save submission");
      setStage("idle");
    } finally {
      setSaving(false);
    }
  };

  const stageLabel = stage === "uploading" ? "Uploading attachment…" : stage === "saving" ? "Saving submission…" : stage === "done" ? "Submitted!" : "";

  const isResubmit = item.submission?.status === "returned";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isResubmit ? "Resubmit work" : "Submit work"} — {item.c.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {isResubmit && item.submission?.trainer_feedback && (
            <div className="rounded border-l-4 border-warning bg-warning/10 p-2 text-xs">
              <div className="font-medium">Trainer asked for revision:</div>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.submission.trainer_feedback}</p>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Attachment (PDF, doc, image, zip — max 20MB)</label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={saving} />
            {file && <p className="text-xs text-muted-foreground mt-1">Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
            {item.submission?.attachment_name && !file && (
              <p className="text-xs text-muted-foreground mt-1">Current: {item.submission.attachment_name}{isResubmit && " — upload a new file to replace"}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{isResubmit ? "Updated notes for trainer" : "Notes for trainer"}</label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isResubmit ? "Describe what you changed in this resubmission…" : "Briefly describe what you submitted, references used, etc."} disabled={saving} />
          </div>
          {stage !== "idle" && (
            <div className={`text-xs flex items-center gap-2 rounded border p-2 ${stage === "done" ? "bg-success/10 text-success border-success/30" : "bg-primary/5 text-primary border-primary/30"}`}>
              {stage === "done" ? <CheckCircle2 className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
              {stageLabel}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} {isResubmit ? "Resubmit" : "Save submission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuizRunner({ open, onOpenChange, quiz }: { open: boolean; onOpenChange: (b: boolean) => void; quiz: { title: string; questions: any[] } | null }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => { if (open) { setAnswers({}); setSubmitted(false); } }, [open, quiz]);
  if (!quiz) return null;
  const score = useMemo(() => quiz.questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0), [answers, quiz]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{quiz.title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {quiz.questions.map((q: any, i: number) => (
            <div key={i} className="space-y-2 border rounded p-3">
              <div className="text-sm font-medium">{i + 1}. {q.question}</div>
              <div className="space-y-1">
                {(q.options || []).map((opt: string, j: number) => {
                  const selected = answers[i] === j;
                  const correct = submitted && j === q.correct;
                  const wrong = submitted && selected && j !== q.correct;
                  return (
                    <button key={j} type="button" disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded border ${correct ? "border-success bg-success/10" : wrong ? "border-destructive bg-destructive/10" : selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                      {String.fromCharCode(65 + j)}. {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation && <p className="text-xs text-muted-foreground italic">💡 {q.explanation}</p>}
            </div>
          ))}
          {submitted ? (
            <div className="rounded border p-3 bg-primary/5 text-center">
              <div className="text-2xl font-bold text-primary">{score} / {quiz.questions.length}</div>
              <div className="text-xs text-muted-foreground">{Math.round((score / quiz.questions.length) * 100)}%</div>
            </div>
          ) : (
            <Button onClick={() => setSubmitted(true)} className="w-full">Submit</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
