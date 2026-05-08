import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Video, ListChecks, ClipboardCheck, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  studentId: string;
  college: string;
  department: string;
  degree: string;
}

export default function MyTrainerCurricula({ studentId, college, department, degree }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<{ title: string; questions: any[] } | null>(null);

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      setLoading(true);
      // Fetch all published curricula and assignments, then filter on the client.
      const [{ data: cur }, { data: assigns }] = await Promise.all([
        supabase.from("trainer_curricula").select("*").eq("status", "published"),
        supabase.from("curriculum_assignments").select("*"),
      ]);
      const curricula = (cur as any[]) || [];
      const A = (assigns as any[]) || [];
      const visible = curricula.filter((c: any) => {
        const rules = A.filter((a) => a.curriculum_id === c.id);
        if (rules.length === 0) {
          // No rules → default to trainer's own institute.
          return c.owner_college && c.owner_college.toLowerCase() === (college || "").toLowerCase();
        }
        return rules.some((a) => {
          if (a.scope_type === "student") return a.student_id === studentId;
          const okC = !a.college || a.college.toLowerCase() === (college || "").toLowerCase();
          const okD = !a.department || a.department.toLowerCase() === (department || "").toLowerCase();
          const okG = !a.degree || a.degree.toLowerCase() === (degree || "").toLowerCase();
          return okC && okD && okG;
        });
      });

      // Pre-load full tree for visible curricula.
      const detailed = await Promise.all(visible.map(async (c: any) => {
        const { data: subs } = await supabase.from("curriculum_subjects").select("*").eq("curriculum_id", c.id).order("sort_order");
        const subjects = (subs as any[]) || [];
        const sIds = subjects.map((s) => s.id);
        const { data: tps } = sIds.length
          ? await supabase.from("curriculum_topics").select("*").in("subject_id", sIds).order("sort_order")
          : { data: [] };
        const topics = (tps as any[]) || [];
        const tIds = topics.map((t) => t.id);
        const [{ data: stp }, { data: vds }, { data: qzs }, { data: ass }] = await Promise.all([
          tIds.length ? supabase.from("curriculum_subtopics").select("*").in("topic_id", tIds).order("sort_order") : Promise.resolve({ data: [] } as any),
          tIds.length ? supabase.from("curriculum_videos").select("*").in("topic_id", tIds).order("sort_order") : Promise.resolve({ data: [] } as any),
          tIds.length ? supabase.from("curriculum_quizzes").select("*").in("topic_id", tIds) : Promise.resolve({ data: [] } as any),
          supabase.from("curriculum_assessments").select("*").eq("curriculum_id", c.id).maybeSingle(),
        ]);
        return { c, subjects, topics, subtopics: (stp as any[]) || [], videos: (vds as any[]) || [], quizzes: (qzs as any[]) || [], assessment: ass as any };
      }));

      setItems(detailed);
      setLoading(false);
    })();
  }, [studentId, college, department, degree]);

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
      <div>
        <h2 className="text-xl font-semibold">My Trainer Curricula</h2>
        <p className="text-sm text-muted-foreground">Custom learning paths created by your trainer for {college || "your institute"}.</p>
      </div>

      {items.map(({ c, subjects, topics, subtopics, videos, quizzes, assessment }) => (
        <Card key={c.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{c.title}</span>
              <Badge variant="outline">{c.owner_name || "Trainer"}</Badge>
            </CardTitle>
            {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
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
                        {subtopics.filter((x: any) => x.topic_id === t.id).map((st: any) => (
                          <div key={st.id} className="rounded border p-2 bg-background">
                            <div className="text-xs font-semibold mb-1">{st.title}</div>
                            <p className="text-xs whitespace-pre-wrap text-muted-foreground">{st.content}</p>
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
          </CardContent>
        </Card>
      ))}

      <QuizRunner open={!!activeQuiz} onOpenChange={(b) => !b && setActiveQuiz(null)} quiz={activeQuiz} />
    </div>
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
