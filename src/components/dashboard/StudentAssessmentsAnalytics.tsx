import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, TrendingUp, Target, Award } from "lucide-react";
import { ContentSkeleton } from "@/components/LoadingFallback";

interface ScoreRow { id: string; module_id: number; score: number; total_questions: number; correct_answers: number; attempted_at: string; }
interface AttemptRow { id: string; assessment_id: string; score: number; total_questions: number; correct_answers: number; completed_at: string | null; started_at: string; assessments?: { title: string; passing_score: number } | null; }

const StudentAssessmentsAnalytics = ({ studentId }: { studentId: string | null }) => {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    (async () => {
      const [sRes, aRes] = await Promise.all([
        supabase.from("student_assessment_scores").select("*").eq("student_id", studentId).order("attempted_at", { ascending: false }),
        supabase.from("assessment_attempts").select("*, assessments(title, passing_score)").eq("student_id", studentId).order("started_at", { ascending: false }),
      ]);
      setScores((sRes.data as any) || []);
      setAttempts((aRes.data as any) || []);
      setLoading(false);
    })();
  }, [studentId]);

  if (loading) return <ContentSkeleton />;

  const allScores = [...scores.map(s => s.score), ...attempts.filter(a => a.completed_at).map(a => a.score)];
  const avgScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const totalAttempts = scores.length + attempts.filter(a => a.completed_at).length;
  const passed = attempts.filter(a => a.completed_at && a.score >= (a.assessments?.passing_score ?? 60)).length;
  const passRate = attempts.length ? Math.round((passed / attempts.filter(a => a.completed_at).length) * 100) || 0 : 0;
  const best = allScores.length ? Math.max(...allScores) : 0;

  const tiles = [
    { label: "Total Attempts", value: totalAttempts, icon: ClipboardCheck, color: "text-primary" },
    { label: "Average Score", value: `${avgScore}%`, icon: TrendingUp, color: "text-accent" },
    { label: "Pass Rate", value: `${passRate}%`, icon: Target, color: "text-success" },
    { label: "Best Score", value: `${best}%`, icon: Award, color: "text-warning" },
  ];

  // Group practice quizzes by module
  const byModule = scores.reduce<Record<number, ScoreRow[]>>((acc, s) => {
    (acc[s.module_id] ||= []).push(s); return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-card-foreground">My Assessment Analytics</h2>
        <p className="text-sm text-muted-foreground">Your personal performance across all quizzes and assessments.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {tiles.map(t => {
          const Icon = t.icon;
          return (
            <Card key={t.label}>
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <Icon className={`h-5 w-5 ${t.color}`} />
                <p className="text-2xl font-display font-bold text-card-foreground">{t.value}</p>
                <p className="text-xs text-muted-foreground">{t.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-display">Recent Custom Assessments</CardTitle></CardHeader>
        <CardContent>
          {attempts.filter(a => a.completed_at).length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No completed assessments yet.</p>
          ) : (
            <div className="space-y-2">
              {attempts.filter(a => a.completed_at).slice(0, 10).map(a => {
                const passing = a.assessments?.passing_score ?? 60;
                const passed = a.score >= passing;
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">{a.assessments?.title || "Assessment"}</p>
                      <p className="text-xs text-muted-foreground">{a.completed_at && new Date(a.completed_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-display font-bold text-card-foreground">{a.score}%</p>
                      <Badge variant={passed ? "default" : "secondary"} className={passed ? "bg-success/10 text-success border-success/20 text-[10px]" : "text-[10px]"}>
                        {passed ? "Passed" : "Failed"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-display">Module Quiz Performance</CardTitle></CardHeader>
        <CardContent>
          {Object.keys(byModule).length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No module quizzes attempted yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byModule).map(([modId, rows]) => {
                const avg = Math.round(rows.reduce((a, b) => a + b.score, 0) / rows.length);
                return (
                  <div key={modId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-card-foreground">Module {modId}</span>
                      <span className="text-xs text-muted-foreground">{rows.length} attempt(s) · avg {avg}%</span>
                    </div>
                    <Progress value={avg} className="h-2" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAssessmentsAnalytics;
