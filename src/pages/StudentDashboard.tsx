import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { modules } from "@/data/modules";
import { useAdminModules } from "@/hooks/useAdminModules";
import { useStudentLearningPaths } from "@/hooks/useLearningPaths";
import {
  BookOpen, MessageSquare, Video, FlaskConical, ClipboardCheck,
  FolderKanban, LogOut, Play, CheckCircle, Sparkles, Code2, Pencil,
  Lock, Crown, User
} from "lucide-react";
import pluginliveLogo from "@/assets/pluginlive-logo.png";
import { getMenuAccess, type MenuAccessConfig } from "@/hooks/useMenuAccessControls";
import ErrorBoundary from "@/components/ErrorBoundary";
import { toast } from "sonner";
import NotificationsPanel from "@/components/dashboard/NotificationsPanel";
import { ContentSkeleton } from "@/components/LoadingFallback";

const AIPlayground = lazy(() => import("@/components/dashboard/AIPlayground"));
const VideoLearning = lazy(() => import("@/components/dashboard/VideoLearning"));
const AssessmentsView = lazy(() => import("@/components/dashboard/AssessmentsView"));
const StudentAssessmentTaker = lazy(() => import("@/components/dashboard/StudentAssessmentTaker"));
const AIToolsSandbox = lazy(() => import("@/components/dashboard/AIToolsSandbox"));
const ProjectsView = lazy(() => import("@/components/dashboard/ProjectsView"));
const ModuleDetailView = lazy(() => import("@/components/dashboard/ModuleDetailView"));
const ProgrammingModule = lazy(() => import("@/components/dashboard/ProgrammingModule"));
const PromptEngineeringLab = lazy(() => import("@/components/dashboard/PromptEngineeringLab"));
const StudentProfilePage = lazy(() => import("@/components/dashboard/StudentProfilePage"));
const AICoachWidget = lazy(() => import("@/components/dashboard/AICoachWidget"));

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState("modules");
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const { adminModules } = useAdminModules();
  const publishedAdminModules = adminModules.filter(m => m.status === "published");
  const studentName = sessionStorage.getItem("studentName") || "Student";
  const studentId = sessionStorage.getItem("studentId");
  const studentCollege = sessionStorage.getItem("studentCollege") || "";
  const studentDepartment = sessionStorage.getItem("studentDepartment") || "";
  const studentDegree = sessionStorage.getItem("studentDegree") || "";
  const overallProgress = 28;
  const [userTier, setUserTier] = useState<"free" | "premium">("free");
  const [menuAccess, setMenuAccess] = useState<MenuAccessConfig>({
    modules: { free: true, premium: true },
    videos: { free: true, premium: true },
    playground: { free: true, premium: true },
    coding: { free: true, premium: true },
    prompts: { free: true, premium: true },
    tools: { free: false, premium: true },
    assessments: { free: true, premium: true },
    projects: { free: false, premium: true },
  });

  useEffect(() => {
    getMenuAccess().then(setMenuAccess);
    if (studentId) {
      supabase.from("students").select("subscription_tier, college, department, degree").eq("id", studentId).single()
        .then(({ data }) => {
          if (data?.subscription_tier === "premium") setUserTier("premium");
          if (data?.college) sessionStorage.setItem("studentCollege", data.college);
          if (data?.department) sessionStorage.setItem("studentDepartment", data.department);
          if (data?.degree) sessionStorage.setItem("studentDegree", data.degree);
        });
    }
  }, [studentId]);

  const { allowedModuleIds, pathNames } = useStudentLearningPaths(studentCollege, studentDepartment, studentDegree, userTier);

  // Filter modules based on learning paths (null = show all)
  const filteredModules = allowedModuleIds === null
    ? modules
    : modules.filter(m => allowedModuleIds.includes(m.id));

  const filteredAdminModules = allowedModuleIds === null
    ? publishedAdminModules
    : publishedAdminModules.filter(m => allowedModuleIds.includes(m.id));

  const allTabs = [
    { value: "modules" as keyof MenuAccessConfig, icon: BookOpen, label: "Modules" },
    { value: "videos" as keyof MenuAccessConfig, icon: Video, label: "Videos" },
    { value: "playground" as keyof MenuAccessConfig, icon: MessageSquare, label: "AI Chat" },
    { value: "coding" as keyof MenuAccessConfig, icon: Code2, label: "Coding" },
    { value: "prompts" as keyof MenuAccessConfig, icon: Pencil, label: "Prompts" },
    { value: "tools" as keyof MenuAccessConfig, icon: FlaskConical, label: "Tools" },
    { value: "assessments" as keyof MenuAccessConfig, icon: ClipboardCheck, label: "Assess" },
    { value: "projects" as keyof MenuAccessConfig, icon: FolderKanban, label: "Projects" },
  ];

  const accessibleTabs = allTabs.filter(tab => menuAccess[tab.value]?.[userTier] !== false);
  const lockedTabs = allTabs.filter(tab => menuAccess[tab.value]?.[userTier] === false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={pluginliveLogo} alt="PluginLive Logo" className="h-7" />
            <span className="font-display font-bold text-gradient-primary">AI LearnHub</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsPanel studentId={null} />
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setShowProfile(true)}>
              <User className="h-4 w-4" /> <span className="hidden sm:inline">{studentName}</span>
            </Button>
            <Link to="/student-login" onClick={() => sessionStorage.clear()}>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" aria-label="Logout">
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8" role="main">
        {showProfile ? (
          <ErrorBoundary>
            <Suspense fallback={<ContentSkeleton />}>
              <StudentProfilePage onBack={() => setShowProfile(false)} />
            </Suspense>
          </ErrorBoundary>
        ) : (
        <>
        {/* Progress Overview */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-card mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-card-foreground">Your Learning Dashboard</h1>
              <p className="text-muted-foreground text-sm">Track your AI learning journey</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-display font-bold text-primary" aria-label={`Overall progress: ${overallProgress}%`}>{overallProgress}%</p>
              <p className="text-xs text-muted-foreground">Overall Progress</p>
            </div>
          </div>
          <Progress value={overallProgress} className="h-2" aria-label={`Progress: ${overallProgress}%`} />
        </div>

        {/* AI Coach Widget */}
        {studentId && (
          <div className="mb-8">
            <ErrorBoundary>
              <Suspense fallback={<ContentSkeleton />}>
                <AICoachWidget
                  studentId={studentId}
                  studentName={studentName}
                  onOpenChat={(msg) => { setActiveTab("playground"); }}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {/* Learning Path indicator */}
        {pathNames.length > 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>Your learning paths: <strong className="text-foreground">{pathNames.join(", ")}</strong></span>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => {
          const isLocked = lockedTabs.some(t => t.value === v);
          if (isLocked) {
            setUpgradeDialogOpen(true);
            return;
          }
          setActiveTab(v);
        }}>
          <TabsList className="grid grid-cols-4 sm:grid-cols-8 mb-8 h-auto gap-1 bg-muted p-1" aria-label="Dashboard sections">
            {allTabs.map((tab) => {
              const Icon = tab.icon;
              const isLocked = menuAccess[tab.value]?.[userTier] === false;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  disabled={false}
                  onClick={(e) => {
                    if (isLocked) {
                      e.preventDefault();
                      setUpgradeDialogOpen(true);
                    }
                  }}
                  className={`gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm ${isLocked ? "opacity-50" : ""}`}
                  aria-label={`${tab.label}${isLocked ? " (Premium)" : ""}`}
                >
                  {isLocked ? <Lock className="h-3 w-3" aria-hidden="true" /> : <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="modules">
            {selectedModuleId ? (
              <ErrorBoundary>
                <Suspense fallback={<ContentSkeleton />}>
                  <ModuleDetailView moduleId={selectedModuleId} onBack={() => setSelectedModuleId(null)} />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" role="list" aria-label="Course modules">
                  {filteredModules.map((mod, i) => {
                    const Icon = mod.icon;
                    const isCompleted = i < 2;
                    const isActive = i === 2;
                    const progress = isCompleted ? 100 : isActive ? 45 : i === 3 ? 10 : 0;

                    return (
                      <div
                        key={mod.id}
                        role="listitem"
                        className={`relative bg-card rounded-lg border p-5 shadow-card transition-all hover:shadow-elevated ${
                          isActive ? "border-primary ring-1 ring-primary/20" : "border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center`}>
                            <Icon className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
                          </div>
                          {isCompleted && <CheckCircle className="h-5 w-5 text-success" aria-label="Completed" />}
                          {isActive && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              In Progress
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-semibold mb-1 text-card-foreground">{mod.title}</h3>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{mod.description}</p>
                        <Progress value={progress} className="h-1.5 mb-2" aria-label={`${mod.title} progress: ${progress}%`} />
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">{progress}% complete</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1 text-primary"
                            onClick={() => setSelectedModuleId(mod.id)}
                            aria-label={`${isCompleted ? "Review" : progress > 0 ? "Continue" : "Start"} ${mod.title}`}
                          >
                            <Play className="h-3 w-3" aria-hidden="true" /> {isCompleted ? "Review" : progress > 0 ? "Continue" : "Start"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredAdminModules.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mt-8 mb-4">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <h3 className="font-display font-semibold text-card-foreground">Additional Modules</h3>
                      <span className="text-xs text-muted-foreground">({filteredAdminModules.length} new)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" role="list">
                      {filteredAdminModules.map((mod) => (
                        <div
                          key={`admin-${mod.id}`}
                          role="listitem"
                          className="relative bg-card rounded-lg border border-accent/20 p-5 shadow-card transition-all hover:shadow-elevated"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-accent flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-accent-foreground" />
                            </div>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">New</span>
                          </div>
                          <h3 className="font-display font-semibold mb-1 text-card-foreground">{mod.title}</h3>
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{mod.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <BookOpen className="h-3 w-3" /> {mod.topics.length} topics · {mod.duration}
                          </div>
                          <Progress value={0} className="h-1.5 mt-3 mb-2" />
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">0% complete</span>
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-accent" onClick={() => setSelectedModuleId(mod.id)}>
                              <Play className="h-3 w-3" /> Start
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="videos">
            <ErrorBoundary>
              <Suspense fallback={<ContentSkeleton />}>
                <VideoLearning />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="playground">
            <ErrorBoundary>
              <Suspense fallback={<ContentSkeleton />}>
                <AIPlayground />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="coding">
            <ErrorBoundary>
              <Suspense fallback={<ContentSkeleton />}>
                <ProgrammingModule />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="prompts">
            <ErrorBoundary>
              <Suspense fallback={<ContentSkeleton />}>
                <PromptEngineeringLab />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="tools">
            <ErrorBoundary>
              <Suspense fallback={<ContentSkeleton />}>
                <AIToolsSandbox />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="assessments">
            <ErrorBoundary>
              <Suspense fallback={<ContentSkeleton />}>
                <StudentAssessmentTaker />
              </Suspense>
            </ErrorBoundary>
            <div className="mt-8 border-t border-border pt-6">
              <h3 className="text-sm font-display font-semibold text-muted-foreground mb-4">Practice Quizzes (Module-based)</h3>
              <ErrorBoundary>
                <Suspense fallback={<ContentSkeleton />}>
                  <AssessmentsView />
                </Suspense>
              </ErrorBoundary>
            </div>
          </TabsContent>

          <TabsContent value="projects">
            <ErrorBoundary>
              <Suspense fallback={<ContentSkeleton />}>
                <ProjectsView />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>

        {/* Premium Upgrade Dialog */}
        <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-warning" /> Upgrade to Premium
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                This feature is available exclusively for Premium subscribers. Upgrade your plan to unlock:
              </p>
              <ul className="space-y-2 text-sm">
                {["All modules & video lessons", "Unlimited AI Chat & Tools", "Full coding challenges (40+ languages)", "Advanced assessments & retakes", "Project guide & document uploads", "Certificate of completion"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-card-foreground">
                    <CheckCircle className="h-4 w-4 text-success shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <div className="bg-warning/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-display font-bold text-card-foreground">₹499<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                <p className="text-xs text-muted-foreground mt-1">or ₹4,999/year (save 17%)</p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)} className="flex-1">Maybe Later</Button>
              <Button className="flex-1 bg-warning text-warning-foreground hover:bg-warning/90 gap-2" onClick={() => {
                setUpgradeDialogOpen(false);
                toast.info("Contact your administrator to upgrade your subscription.");
              }}>
                <Crown className="h-4 w-4" /> Upgrade Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
