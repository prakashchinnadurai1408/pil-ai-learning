import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { modules } from "@/data/modules";
import { moduleContents, LessonContent } from "@/data/moduleContent";
import {
  ArrowLeft, BookOpen, Activity, Video, Dumbbell,
  CheckCircle, ChevronRight, Clock, Target, Lightbulb, Trophy
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import ModuleQuiz from "./ModuleQuiz";

interface ModuleDetailViewProps {
  moduleId: number;
  onBack: () => void;
}

const typeIcons: Record<LessonContent["type"], typeof BookOpen> = {
  reading: BookOpen,
  activity: Activity,
  video: Video,
  exercise: Dumbbell,
};

const typeLabels: Record<LessonContent["type"], string> = {
  reading: "Reading",
  activity: "Activity",
  video: "Video",
  exercise: "Exercise",
};

const ModuleDetailView = ({ moduleId, onBack }: ModuleDetailViewProps) => {
  const mod = modules.find((m) => m.id === moduleId);
  const content = moduleContents.find((c) => c.moduleId === moduleId);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  if (!mod || !content) return null;

  const Icon = mod.icon;
  const activeLesson = content.lessons[activeLessonIdx];
  const totalItems = content.lessons.length + 1; // +1 for quiz
  const completedItems = completedLessons.size + (quizCompleted ? 1 : 0);
  const progress = Math.round((completedItems / totalItems) * 100);

  const markComplete = () => {
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      next.add(activeLessonIdx);
      return next;
    });
    if (activeLessonIdx < content.lessons.length - 1) {
      setActiveLessonIdx(activeLessonIdx + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Modules
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border p-6 shadow-card">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-display font-bold text-card-foreground">{mod.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{content.overview}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-2xl font-display font-bold text-primary">{progress}%</p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
        </div>
        <Progress value={progress} className="h-1.5 mb-4" />

        {/* Learning Outcomes */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" /> Learning Outcomes
          </h4>
          <ul className="grid sm:grid-cols-2 gap-1.5">
            {content.learningOutcomes.map((o, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <ChevronRight className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                {o}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Content Area */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Lesson Navigation */}
        <div className="lg:col-span-1 bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-display font-semibold text-sm text-card-foreground">Lessons</h3>
          </div>
          <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
            {content.lessons.map((lesson, i) => {
              const LIcon = typeIcons[lesson.type];
              const done = completedLessons.has(i);
              return (
                <button
                  key={lesson.id}
                  onClick={() => { setActiveLessonIdx(i); setShowQuiz(false); }}
                  className={`w-full p-3 text-left flex items-center gap-2.5 transition-colors hover:bg-muted/50 ${
                    !showQuiz && activeLessonIdx === i ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done ? "bg-success/10" : "bg-muted"
                  }`}>
                    {done ? (
                      <CheckCircle className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <LIcon className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-card-foreground truncate">{lesson.title}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>{typeLabels[lesson.type]}</span>
                      <span>·</span>
                      <Clock className="h-2.5 w-2.5" />
                      <span>{lesson.duration}</span>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Module Quiz entry */}
            <button
              onClick={() => setShowQuiz(true)}
              className={`w-full p-3 text-left flex items-center gap-2.5 transition-colors hover:bg-muted/50 ${
                showQuiz ? "bg-primary/5 border-l-2 border-l-primary" : ""
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                quizCompleted ? "bg-success/10" : "bg-warning/10"
              }`}>
                {quizCompleted ? (
                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Trophy className="h-3 w-3 text-warning" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-card-foreground truncate">Module Quiz</p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>Assessment</span>
                  <span>·</span>
                  <Trophy className="h-2.5 w-2.5" />
                  <span>Test your knowledge</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Lesson Content */}
        <div className="lg:col-span-3 bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                  {typeLabels[activeLesson.type]}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {activeLesson.duration}
                </span>
              </div>
              <h3 className="font-display font-semibold text-lg text-card-foreground">{activeLesson.title}</h3>
            </div>
            <span className="text-xs text-muted-foreground">
              {activeLessonIdx + 1} / {content.lessons.length}
            </span>
          </div>

          <div className="p-6 max-h-[540px] overflow-y-auto">
            <div className="prose prose-sm max-w-none text-muted-foreground prose-headings:text-card-foreground prose-strong:text-card-foreground prose-code:text-primary">
              <ReactMarkdown>{activeLesson.content}</ReactMarkdown>
            </div>

            {activeLesson.keyTakeaways && (
              <div className="mt-6 bg-primary/5 rounded-lg p-4 border border-primary/10">
                <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-warning" /> Key Takeaways
                </h4>
                <ul className="space-y-1.5">
                  {activeLesson.keyTakeaways.map((t, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 mt-0.5 text-success flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={activeLessonIdx === 0}
              onClick={() => setActiveLessonIdx(activeLessonIdx - 1)}
            >
              ← Previous
            </Button>
            <Button
              size="sm"
              onClick={markComplete}
              className="bg-gradient-primary border-0 text-primary-foreground gap-1.5"
            >
              {completedLessons.has(activeLessonIdx) ? (
                activeLessonIdx < content.lessons.length - 1 ? "Next Lesson →" : "✓ Completed"
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Mark Complete & Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleDetailView;
