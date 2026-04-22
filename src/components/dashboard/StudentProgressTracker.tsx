import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, BookOpen, Trophy, Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { useAdminModules } from "@/hooks/useAdminModules";
import { modules as staticModules } from "@/data/modules";

interface Recommendation { module_id: number; title: string; reason: string }

interface Props {
  studentId: string | null;
  onOpenModule?: (moduleId: number) => void;
}

const StudentProgressTracker = ({ studentId, onOpenModule }: Props) => {
  const { adminModules } = useAdminModules();
  const [progress, setProgress] = useState<{ module_id: number; completed: boolean; progress_percent: number; last_accessed: string | null }[]>([]);
  const [scores, setScores] = useState<{ module_id: number; score: number; total_questions: number; correct_answers: number; attempted_at: string }[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);

  const moduleTitle = (id: number) => {
    const am = adminModules.find((m) => m.id === id);
    if (am) return am.title;
    const sm = staticModules.find((m) => m.id === id);
    return sm?.title ?? `Module ${id}`;
  };

  const load = async () => {
    if (!studentId) { setLoading(false); return; }
    setLoading(true);
    const [p, s] = await Promise.all([
      supabase.from("student_module_progress").select("module_id, completed, progress_percent, last_accessed").eq("student_id", studentId).order("last_accessed", { ascending: false }),
      supabase.from("student_assessment_scores").select("module_id, score, total_questions, correct_answers, attempted_at").eq("student_id", studentId).order("attempted_at", { ascending: false }).limit(10),
    ]);
    setProgress((p.data ?? []) as any);
    setScores((s.data ?? []) as any);
    setLoading(false);
  };

  const loadRecs = async () => {
    if (!studentId) return;
    setRecLoading(true);
    const { data, error } = await supabase.functions.invoke("recommend-next-topics", { body: { studentId } });
    setRecLoading(false);
    if (error) { console.warn(error); return; }
    setRecs(((data as any)?.recommendations || []) as Recommendation[]);
  };

  useEffect(() => { load(); loadRecs(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [studentId]);

  const completed = progress.filter((p) => p.completed);
  const inFlight = progress.filter((p) => !p.completed && p.progress_percent > 0);
  const avgScore = scores.length ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length) : 0;

  if (!studentId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Sign in to see your progress.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Trophy className="h-5 w-5 text-warning" /> Your Progress</span>
          <Button variant="ghost" size="sm" onClick={() => { load(); loadRecs(); }} className="gap-1.5"><RefreshCw className="h-4 w-4" /> Refresh</Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <div className="text-2xl font-display font-bold text-primary">{completed.length}</div>
                <div className="text-xs text-muted-foreground">Completed lessons</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <div className="text-2xl font-display font-bold text-primary">{scores.length}</div>
                <div className="text-xs text-muted-foreground">Quizzes taken</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <div className="text-2xl font-display font-bold text-primary">{avgScore}%</div>
                <div className="text-xs text-muted-foreground">Average score</div>
              </div>
            </div>

            {/* Completed lessons */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Completed lessons</h4>
              {completed.length === 0 ? (
                <p className="text-xs text-muted-foreground">No lessons completed yet — start one to see it here.</p>
              ) : (
                <div className="space-y-1">
                  {completed.slice(0, 5).map((p) => (
                    <button key={p.module_id} onClick={() => onOpenModule?.(p.module_id)} className="w-full flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/60 transition-colors text-left">
                      <span className="truncate">{moduleTitle(p.module_id)}</span>
                      <Badge variant="outline" className="text-xs text-success border-success">100%</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* In-progress */}
            {inFlight.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-primary" /> In progress</h4>
                <div className="space-y-2">
                  {inFlight.slice(0, 3).map((p) => (
                    <button key={p.module_id} onClick={() => onOpenModule?.(p.module_id)} className="w-full text-left space-y-1 hover:bg-muted/60 transition-colors p-2 rounded">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">{moduleTitle(p.module_id)}</span>
                        <span className="text-xs text-muted-foreground">{p.progress_percent}%</span>
                      </div>
                      <Progress value={p.progress_percent} className="h-1.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent quiz scores */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Trophy className="h-4 w-4 text-warning" /> Recent quiz scores</h4>
              {scores.length === 0 ? (
                <p className="text-xs text-muted-foreground">Take a quiz to see results here.</p>
              ) : (
                <div className="space-y-1">
                  {scores.slice(0, 4).map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30">
                      <span className="truncate">{moduleTitle(s.module_id)}</span>
                      <Badge variant={s.score >= 70 ? "default" : "secondary"} className="text-xs">
                        {s.correct_answers}/{s.total_questions} · {s.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI recommendations */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Recommended next topics</h4>
              {recLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Analysing your progress…</div>
              ) : recs.length === 0 ? (
                <p className="text-xs text-muted-foreground">Recommendations will appear once we have a bit more activity.</p>
              ) : (
                <div className="space-y-2">
                  {recs.map((r) => (
                    <button key={r.module_id} onClick={() => onOpenModule?.(r.module_id)} className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors group">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{r.title}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentProgressTracker;
