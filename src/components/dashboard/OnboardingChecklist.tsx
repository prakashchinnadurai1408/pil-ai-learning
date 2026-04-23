import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Circle, User, PlayCircle, ClipboardCheck,
  MessageSquare, FolderKanban, Sparkles, ArrowRight,
} from "lucide-react";

interface Props {
  studentId: string | null;
  studentCollege: string;
  studentDepartment: string;
  studentDegree: string;
  onNavigate: (tab: string) => void;
  onOpenProfile: () => void;
}

interface Step {
  key: "profile" | "lesson" | "quiz" | "ai_chat" | "project";
  label: string;
  description: string;
  icon: typeof User;
  cta: string;
  action: () => void;
  done: boolean;
}

const AI_CHAT_FLAG = "lovable.onboarding.aiChat";

/** External helper any chat surface can call to mark "first AI chat" as done. */
export function markFirstAiChat() {
  try {
    localStorage.setItem(AI_CHAT_FLAG, "1");
    window.dispatchEvent(new Event("lovable:onboarding-updated"));
  } catch {
    /* ignore */
  }
}

const OnboardingChecklist = ({
  studentId,
  studentCollege,
  studentDepartment,
  studentDegree,
  onNavigate,
  onOpenProfile,
}: Props) => {
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [hasLesson, setHasLesson] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [hasProject, setHasProject] = useState(false);
  const [hasAiChat, setHasAiChat] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const profileComplete = useMemo(
    () => Boolean(studentCollege && studentDepartment && studentDegree),
    [studentCollege, studentDepartment, studentDegree],
  );

  const refresh = async () => {
    setHasAiChat(localStorage.getItem(AI_CHAT_FLAG) === "1");
    if (!studentId) {
      setProgressLoaded(true);
      return;
    }
    const [lesson, quiz, project] = await Promise.all([
      supabase
        .from("student_module_progress")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId),
      supabase
        .from("assessment_attempts")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId),
      supabase
        .from("student_project_progress")
        .select("id", { count: "exact", head: true })
        .eq("stream_id", studentId),
    ]);
    setHasLesson((lesson.count ?? 0) > 0);
    setHasQuiz((quiz.count ?? 0) > 0);
    setHasProject((project.count ?? 0) > 0);
    setProgressLoaded(true);
  };

  useEffect(() => {
    refresh();
    const onUpd = () => refresh();
    window.addEventListener("lovable:onboarding-updated", onUpd);
    return () => window.removeEventListener("lovable:onboarding-updated", onUpd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    setDismissed(localStorage.getItem("lovable.onboarding.dismissed") === "1");
  }, []);

  const steps: Step[] = [
    {
      key: "profile",
      label: "Complete your profile",
      description: "Add your college, department and degree so we can tailor content.",
      icon: User,
      cta: "Open profile",
      action: onOpenProfile,
      done: profileComplete,
    },
    {
      key: "lesson",
      label: "Start your first lesson",
      description: "Open any module and watch a video to get going.",
      icon: PlayCircle,
      cta: "Browse modules",
      action: () => onNavigate("modules"),
      done: hasLesson,
    },
    {
      key: "quiz",
      label: "Take your first quiz",
      description: "Test what you've learned with a short assessment.",
      icon: ClipboardCheck,
      cta: "Go to assessments",
      action: () => onNavigate("assessments"),
      done: hasQuiz,
    },
    {
      key: "ai_chat",
      label: "Try the AI Chat",
      description: "Ask Aira anything about your modules.",
      icon: MessageSquare,
      cta: "Open AI Chat",
      action: () => onNavigate("playground"),
      done: hasAiChat,
    },
    {
      key: "project",
      label: "Kick off your first project",
      description: "Start a guided academic project to apply your skills.",
      icon: FolderKanban,
      cta: "Open projects",
      action: () => onNavigate("projects"),
      done: hasProject,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);
  const allDone = completed === steps.length;

  if (!progressLoaded) return null;
  if (dismissed && allDone) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            {allDone ? "You're all set!" : "Get started"}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {allDone
              ? "You've completed every onboarding step. Great work!"
              : `Finish these ${steps.length - completed} steps to unlock your full learning experience.`}
          </p>
        </div>
        <Badge variant="outline" className="border-primary text-primary">
          {completed}/{steps.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={pct} className="h-2" aria-label={`Onboarding ${pct}% complete`} />
        <ul className="space-y-2">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <li
                key={s.key}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  s.done ? "border-success/30 bg-success/5" : "border-border bg-card"
                }`}
              >
                {s.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {s.label}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
                {!s.done && (
                  <Button size="sm" variant="ghost" onClick={s.action} className="gap-1">
                    {s.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {allDone && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              localStorage.setItem("lovable.onboarding.dismissed", "1");
              setDismissed(true);
            }}
          >
            Hide checklist
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingChecklist;
