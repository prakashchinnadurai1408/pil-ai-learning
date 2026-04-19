import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { modules } from "@/data/modules";
import { moduleContents, LessonContent } from "@/data/moduleContent";
import { useAdminModules, AdminModule } from "@/hooks/useAdminModules";
import {
  ArrowLeft, BookOpen, Activity, Video, Dumbbell,
  CheckCircle, ChevronRight, Clock, Target, Lightbulb, Trophy, Brain, Play, FileText
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import ModuleQuiz from "./ModuleQuiz";
import ModuleVideosPanel from "./ModuleVideosPanel";
import ModuleAICoachPanel from "./ModuleAICoachPanel";

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
  const staticMod = modules.find((m) => m.id === moduleId);
  const content = moduleContents.find((c) => c.moduleId === moduleId);
  const { adminModules } = useAdminModules();
  const adminMod = adminModules.find((m) => m.id === moduleId);

  const studentId = sessionStorage.getItem("studentId");
  const studentName = sessionStorage.getItem("studentName") || "Student";

  if (!staticMod && adminMod) {
    return <AdminModuleDetailView mod={adminMod} moduleId={moduleId} onBack={onBack} studentId={studentId} studentName={studentName} />;
  }

  if (!staticMod || !content) return null;

  return (
    <StaticModuleDetail
      mod={staticMod}
      content={content}
      moduleId={moduleId}
      onBack={onBack}
      studentId={studentId}
      studentName={studentName}
    />
  );
};

/* ── Static module ─────────────────────────────────────────────────── */

interface StaticDetailProps {
  mod: typeof modules[number];
  content: typeof moduleContents[number];
  moduleId: number;
  onBack: () => void;
  studentId: string | null;
  studentName: string;
}

const StaticModuleDetail = ({ mod, content, moduleId, onBack, studentId, studentName }: StaticDetailProps) => {
  const Icon = mod.icon;
  const [tab, setTab] = useState<"content" | "videos" | "quiz">("content");
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [quizCompleted, setQuizCompleted] = useState(false);

  const activeLesson = content.lessons[activeLessonIdx];
  const totalItems = content.lessons.length + 1;
  const progress = Math.round(((completedLessons.size + (quizCompleted ? 1 : 0)) / totalItems) * 100);

  const markComplete = () => {
    setCompletedLessons((p) => new Set(p).add(activeLessonIdx));
    if (activeLessonIdx < content.lessons.length - 1) setActiveLessonIdx(activeLessonIdx + 1);
    else setTab("quiz");
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Modules
      </Button>

      <div className="bg-card rounded-lg border border-border p-5 shadow-card">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-display font-bold text-card-foreground">{mod.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{content.overview}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xl font-display font-bold text-primary">{progress}%</p>
            <p className="text-[10px] text-muted-foreground">Complete</p>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="content" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Content</TabsTrigger>
              <TabsTrigger value="videos" className="gap-1.5"><Play className="h-3.5 w-3.5" /> Videos</TabsTrigger>
              <TabsTrigger value="quiz" className="gap-1.5"><Trophy className="h-3.5 w-3.5" /> Quiz</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-3">
              <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
                <div className="bg-muted/30 p-3 border-b border-border">
                  <h4 className="text-xs font-semibold text-card-foreground flex items-center gap-1.5 mb-1.5">
                    <Target className="h-3.5 w-3.5 text-primary" /> Learning Outcomes
                  </h4>
                  <ul className="grid sm:grid-cols-2 gap-1">
                    {content.learningOutcomes.map((o, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <ChevronRight className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />{o}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid sm:grid-cols-[180px_1fr]">
                  <div className="border-r border-border max-h-[520px] overflow-y-auto">
                    {content.lessons.map((lesson, i) => {
                      const LIcon = typeIcons[lesson.type];
                      const done = completedLessons.has(i);
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setActiveLessonIdx(i)}
                          className={`w-full p-2.5 text-left flex items-center gap-2 border-b border-border transition-colors hover:bg-muted/50 ${
                            activeLessonIdx === i ? "bg-primary/5 border-l-2 border-l-primary" : ""
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-success/10" : "bg-muted"}`}>
                            {done ? <CheckCircle className="h-3 w-3 text-success" /> : <LIcon className="h-2.5 w-2.5 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-card-foreground truncate">{lesson.title}</p>
                            <p className="text-[9px] text-muted-foreground">{typeLabels[lesson.type]} · {lesson.duration}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col">
                    <div className="p-4 border-b border-border">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">{typeLabels[activeLesson.type]}</span>
                      <h3 className="font-display font-semibold text-base text-card-foreground mt-1">{activeLesson.title}</h3>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" /> {activeLesson.duration}</p>
                    </div>
                    <div className="p-4 max-h-[420px] overflow-y-auto">
                      <div className="prose prose-sm max-w-none text-muted-foreground prose-headings:text-card-foreground prose-strong:text-card-foreground prose-code:text-primary">
                        <ReactMarkdown>{activeLesson.content}</ReactMarkdown>
                      </div>
                      {activeLesson.keyTakeaways && (
                        <div className="mt-4 bg-primary/5 rounded-lg p-3 border border-primary/10">
                          <h4 className="text-xs font-semibold text-card-foreground flex items-center gap-1.5 mb-1.5">
                            <Lightbulb className="h-3 w-3 text-warning" /> Key Takeaways
                          </h4>
                          <ul className="space-y-1">
                            {activeLesson.keyTakeaways.map((t, i) => (
                              <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                <CheckCircle className="h-3 w-3 mt-0.5 text-success flex-shrink-0" />{t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-border flex items-center justify-between">
                      <Button variant="outline" size="sm" disabled={activeLessonIdx === 0} onClick={() => setActiveLessonIdx(activeLessonIdx - 1)}>← Previous</Button>
                      <Button size="sm" onClick={markComplete} className="bg-gradient-primary border-0 text-primary-foreground gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {activeLessonIdx < content.lessons.length - 1 ? "Mark & Next" : "Mark & Take Quiz"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="videos" className="mt-3">
              <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
                <ModuleVideosPanel
                  moduleId={moduleId}
                  topics={content.lessons.map((l) => ({ id: String(l.id), title: l.title }))}
                  activeTopicId={String(activeLesson.id)}
                  activeTopicTitle={activeLesson.title}
                />
              </div>
            </TabsContent>

            <TabsContent value="quiz" className="mt-3">
              <div className="bg-card rounded-lg border border-border shadow-card p-5">
                <div className="mb-4">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning uppercase">Quiz</span>
                  <h3 className="font-display font-semibold text-lg text-card-foreground mt-1">Module Quiz</h3>
                  <p className="text-xs text-muted-foreground">Score 70%+ to mark this module complete.</p>
                </div>
                <ModuleQuiz
                  moduleId={moduleId}
                  moduleName={mod.title}
                  onComplete={(score, total) => { if (Math.round((score / total) * 100) >= 70) setQuizCompleted(true); }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <ModuleAICoachPanel
            studentId={studentId}
            studentName={studentName}
            moduleId={moduleId}
            moduleTitle={mod.title}
          />
        </div>
      </div>
    </div>
  );
};

/* ── Admin module ──────────────────────────────────────────────────── */

interface AdminDetailProps {
  mod: AdminModule;
  moduleId: number;
  onBack: () => void;
  studentId: string | null;
  studentName: string;
}

const AdminModuleDetailView = ({ mod, moduleId, onBack, studentId, studentName }: AdminDetailProps) => {
  const [tab, setTab] = useState<"content" | "videos" | "quiz">("content");
  const [activeIdx, setActiveIdx] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [quizCompleted, setQuizCompleted] = useState(false);
  const topics = mod.topics;
  const totalItems = topics.length + 1;
  const progress = totalItems > 0 ? Math.round(((completed.size + (quizCompleted ? 1 : 0)) / totalItems) * 100) : 0;
  const activeTopic = topics[activeIdx];

  const markComplete = () => {
    setCompleted((p) => new Set(p).add(activeIdx));
    if (activeIdx < topics.length - 1) setActiveIdx(activeIdx + 1);
    else setTab("quiz");
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Modules
      </Button>

      <div className="bg-card rounded-lg border border-border p-5 shadow-card">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-accent flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-display font-bold text-card-foreground">{mod.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xl font-display font-bold text-primary">{progress}%</p>
            <p className="text-[10px] text-muted-foreground">Complete</p>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="content" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Content</TabsTrigger>
              <TabsTrigger value="videos" className="gap-1.5"><Play className="h-3.5 w-3.5" /> Videos</TabsTrigger>
              <TabsTrigger value="quiz" className="gap-1.5"><Trophy className="h-3.5 w-3.5" /> Quiz</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-3">
              <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
                <div className="grid sm:grid-cols-[180px_1fr]">
                  <div className="border-r border-border max-h-[520px] overflow-y-auto">
                    {topics.map((topic, i) => {
                      const done = completed.has(i);
                      return (
                        <button key={topic.id} onClick={() => setActiveIdx(i)}
                          className={`w-full p-2.5 text-left flex items-center gap-2 border-b border-border transition-colors hover:bg-muted/50 ${activeIdx === i ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-success/10" : "bg-muted"}`}>
                            {done ? <CheckCircle className="h-3 w-3 text-success" /> : <BookOpen className="h-2.5 w-2.5 text-muted-foreground" />}
                          </div>
                          <p className="text-[11px] font-medium text-card-foreground truncate">{topic.title}</p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col">
                    {activeTopic ? (
                      <>
                        <div className="p-4 border-b border-border">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">Topic</span>
                          <h3 className="font-display font-semibold text-base text-card-foreground mt-1">{activeTopic.title}</h3>
                        </div>
                        <div className="p-4 max-h-[420px] overflow-y-auto">
                          <p className="text-sm text-muted-foreground">{activeTopic.description}</p>
                          {activeTopic.suggested_videos.length > 0 && (
                            <div className="mt-4 bg-primary/5 rounded-lg p-3 border border-primary/10">
                              <h4 className="text-xs font-semibold text-card-foreground flex items-center gap-1.5 mb-1.5">
                                <Video className="h-3.5 w-3.5 text-primary" /> Suggested Videos
                              </h4>
                              <ul className="space-y-1">
                                {activeTopic.suggested_videos.map((v, i) => (
                                  <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                    <ChevronRight className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />{v}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="p-3 border-t border-border flex items-center justify-between">
                          <Button variant="outline" size="sm" disabled={activeIdx === 0} onClick={() => setActiveIdx(activeIdx - 1)}>← Previous</Button>
                          <Button size="sm" onClick={markComplete} className="bg-gradient-primary border-0 text-primary-foreground gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" />
                            {activeIdx < topics.length - 1 ? "Mark & Next" : "Mark & Take Quiz"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 text-center text-muted-foreground text-sm">No topics available yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="videos" className="mt-3">
              <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
                <ModuleVideosPanel
                  moduleId={moduleId}
                  topics={topics.map((t) => ({ id: t.id, title: t.title }))}
                  activeTopicId={activeTopic?.id ?? null}
                  activeTopicTitle={activeTopic?.title ?? null}
                />
              </div>
            </TabsContent>

            <TabsContent value="quiz" className="mt-3">
              <div className="bg-card rounded-lg border border-border shadow-card p-5">
                <div className="mb-4">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning uppercase">Quiz</span>
                  <h3 className="font-display font-semibold text-lg text-card-foreground mt-1">Module Quiz</h3>
                </div>
                <ModuleQuiz moduleId={moduleId} moduleName={mod.title}
                  onComplete={(score, total) => { if (Math.round((score / total) * 100) >= 70) setQuizCompleted(true); }} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <ModuleAICoachPanel studentId={studentId} studentName={studentName} moduleId={moduleId} moduleTitle={mod.title} />
        </div>
      </div>
    </div>
  );
};

export default ModuleDetailView;
