import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Sparkles, RefreshCw } from "lucide-react";
import { modules } from "@/data/modules";
import { toast } from "sonner";

interface AICoachWidgetProps {
  studentId: string;
  studentName: string;
  onOpenChat?: (message: string) => void;
}

interface StudentStats {
  moduleProgress: { module_id: number; progress_percent: number; completed: boolean }[];
  quizScores: { module_id: number; score: number }[];
  assessmentScores: { score: number; correct_answers: number; total_questions: number }[];
  codingSolved: number;
}

interface CoachAdvice {
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  overallScore: number;
}

const AICoachWidget = ({ studentId, studentName, onOpenChat }: AICoachWidgetProps) => {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [studentId]);

  const fetchStats = async () => {
    setLoading(true);
    const [{ data: modProgress }, { data: quizScores }, { data: assessScores }, { data: codingSolved }] = await Promise.all([
      supabase.from("student_module_progress").select("module_id, progress_percent, completed").eq("student_id", studentId),
      supabase.from("student_assessment_scores").select("module_id, score").eq("student_id", studentId),
      supabase.from("assessment_attempts").select("score, correct_answers, total_questions").eq("student_id", studentId),
      supabase.from("student_solved_challenges").select("id").eq("student_name", studentName),
    ]);

    const s: StudentStats = {
      moduleProgress: modProgress || [],
      quizScores: quizScores || [],
      assessmentScores: assessScores || [],
      codingSolved: codingSolved?.length || 0,
    };
    setStats(s);
    generateLocalAdvice(s);
    setLoading(false);
  };

  const generateLocalAdvice = (s: StudentStats) => {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const nextSteps: string[] = [];

    // Module analysis
    const completedModules = s.moduleProgress.filter(m => m.completed);
    const inProgressModules = s.moduleProgress.filter(m => m.progress_percent > 0 && !m.completed);
    const totalModules = modules.length;
    const completionRate = Math.round((completedModules.length / totalModules) * 100);

    if (completedModules.length > 3) strengths.push(`Completed ${completedModules.length}/${totalModules} modules — great momentum!`);
    if (completedModules.length === 0 && inProgressModules.length > 0) improvements.push("Focus on finishing at least one module before starting new ones");

    // Quiz analysis
    const avgQuizScore = s.quizScores.length > 0
      ? Math.round(s.quizScores.reduce((a, b) => a + b.score, 0) / s.quizScores.length)
      : 0;

    if (avgQuizScore >= 80) strengths.push(`Strong quiz performance (${avgQuizScore}% avg)`);
    else if (avgQuizScore > 0 && avgQuizScore < 60) improvements.push(`Quiz scores need attention (${avgQuizScore}% avg) — review module content before retaking`);

    // Assessment analysis
    const avgAssessment = s.assessmentScores.length > 0
      ? Math.round(s.assessmentScores.reduce((a, b) => a + b.score, 0) / s.assessmentScores.length)
      : 0;

    if (avgAssessment >= 70) strengths.push(`Solid assessment performance (${avgAssessment}% avg)`);
    else if (s.assessmentScores.length > 0 && avgAssessment < 60) improvements.push(`Assessment scores are below passing threshold (${avgAssessment}%) — focus on weak areas`);

    // Coding
    if (s.codingSolved >= 10) strengths.push(`${s.codingSolved} coding challenges solved — impressive practice!`);
    else if (s.codingSolved < 3) improvements.push("Try solving more coding challenges to build practical skills");

    // Next steps
    const unstartedModules = modules.filter(m => !s.moduleProgress.find(p => p.module_id === m.id && p.progress_percent > 0));
    if (inProgressModules.length > 0) {
      const nextMod = modules.find(m => m.id === inProgressModules[0].module_id);
      if (nextMod) nextSteps.push(`Continue "${nextMod.title}" (${inProgressModules[0].progress_percent}% done)`);
    }
    if (unstartedModules.length > 0) nextSteps.push(`Start "${unstartedModules[0].title}" next`);
    if (s.quizScores.length === 0) nextSteps.push("Take your first module quiz to benchmark knowledge");
    if (s.codingSolved < 5) nextSteps.push("Solve 5 coding challenges this week");

    if (strengths.length === 0) strengths.push("Getting started — every expert was once a beginner!");
    if (nextSteps.length === 0) nextSteps.push("Keep up the great work and explore advanced topics");

    setAdvice({
      strengths,
      improvements,
      nextSteps,
      overallScore: Math.max(completionRate, 5),
    });
  };

  const askAiraForAdvice = () => {
    if (!stats || !onOpenChat) return;
    const completedCount = stats.moduleProgress.filter(m => m.completed).length;
    const avgQuiz = stats.quizScores.length > 0
      ? Math.round(stats.quizScores.reduce((a, b) => a + b.score, 0) / stats.quizScores.length)
      : 0;
    const prompt = `As my AI coach, give me a detailed personalized learning plan. Here are my stats: ${completedCount}/${modules.length} modules completed, ${avgQuiz}% avg quiz score, ${stats.assessmentScores.length} assessments taken, ${stats.codingSolved} coding challenges solved. What should I focus on next and how can I improve?`;
    onOpenChat(prompt);
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-8">
          <div className="h-6 bg-muted rounded w-1/3 mb-4" />
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            AI Coach — Personalized Insights
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={fetchStats} className="text-xs gap-1">
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
            {onOpenChat && (
              <Button size="sm" variant="outline" onClick={askAiraForAdvice} className="text-xs gap-1">
                <Sparkles className="h-3 w-3" /> Ask Aira for Advice
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress Ring */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <path className="text-muted" stroke="currentColor" strokeWidth="3" fill="none"
                d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" />
              <path className="text-primary" stroke="currentColor" strokeWidth="3" fill="none"
                strokeDasharray={`${advice?.overallScore || 0}, 100`}
                d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
              {advice?.overallScore || 0}%
            </span>
          </div>
          <div>
            <p className="font-semibold text-foreground">Learning Progress</p>
            <p className="text-xs text-muted-foreground">
              {stats?.moduleProgress.filter(m => m.completed).length || 0}/{modules.length} modules · {stats?.codingSolved || 0} challenges
            </p>
          </div>
        </div>

        {/* Strengths */}
        {advice && advice.strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-4 w-4 text-success" /> Strengths
            </h4>
            <div className="space-y-1">
              {advice.strengths.map((s, i) => (
                <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" /> {s}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Areas to Improve */}
        {advice && advice.improvements.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Focus Areas
            </h4>
            <div className="space-y-1">
              {advice.improvements.map((s, i) => (
                <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" /> {s}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        {advice && advice.nextSteps.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <Sparkles className="h-4 w-4 text-primary" /> Recommended Next Steps
            </h4>
            <div className="space-y-1">
              {advice.nextSteps.map((s, i) => (
                <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 text-xs">{i + 1}</Badge> {s}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AICoachWidget;
