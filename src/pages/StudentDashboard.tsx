import { useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { modules } from "@/data/modules";
import { useAdminModules } from "@/hooks/useAdminModules";
import {
  BookOpen, MessageSquare, Video, FlaskConical, ClipboardCheck,
  FolderKanban, LogOut, Play, CheckCircle, Sparkles, Code2
} from "lucide-react";
import pluginliveLogo from "@/assets/pluginlive-logo.png";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotificationsPanel from "@/components/dashboard/NotificationsPanel";
import { ContentSkeleton } from "@/components/LoadingFallback";

const AIPlayground = lazy(() => import("@/components/dashboard/AIPlayground"));
const VideoLearning = lazy(() => import("@/components/dashboard/VideoLearning"));
const AssessmentsView = lazy(() => import("@/components/dashboard/AssessmentsView"));
const AIToolsSandbox = lazy(() => import("@/components/dashboard/AIToolsSandbox"));
const ProjectsView = lazy(() => import("@/components/dashboard/ProjectsView"));
const ModuleDetailView = lazy(() => import("@/components/dashboard/ModuleDetailView"));
const ProgrammingModule = lazy(() => import("@/components/dashboard/ProgrammingModule"));

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState("modules");
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const { adminModules } = useAdminModules();
  const publishedAdminModules = adminModules.filter(m => m.status === "published");
  const studentName = sessionStorage.getItem("studentName") || "Student";
  const overallProgress = 28;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={pluginliveLogo} alt="PluginLive Logo" className="h-7" />
            <span className="font-display font-bold text-gradient-primary">AI LearnHub</span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationsPanel studentId={null} />
            <span className="text-sm text-muted-foreground hidden sm:block">Welcome, {studentName}</span>
            <Link to="/student-login" onClick={() => sessionStorage.clear()}>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" aria-label="Logout">
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8" role="main">
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 sm:grid-cols-7 mb-8 h-auto gap-1 bg-muted p-1" aria-label="Dashboard sections">
            {[
              { value: "modules", icon: BookOpen, label: "Modules" },
              { value: "videos", icon: Video, label: "Videos" },
              { value: "playground", icon: MessageSquare, label: "AI Chat" },
              { value: "coding", icon: Code2, label: "Coding" },
              { value: "tools", icon: FlaskConical, label: "Tools" },
              { value: "assessments", icon: ClipboardCheck, label: "Assess" },
              { value: "projects", icon: FolderKanban, label: "Projects" },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm" aria-label={tab.label}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
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
                  {modules.map((mod, i) => {
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

                {publishedAdminModules.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mt-8 mb-4">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <h3 className="font-display font-semibold text-card-foreground">Additional Modules</h3>
                      <span className="text-xs text-muted-foreground">({publishedAdminModules.length} new)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" role="list">
                      {publishedAdminModules.map((mod) => (
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
                <AssessmentsView />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="projects">
            <ErrorBoundary>
              <Suspense fallback={<ContentSkeleton />}>
                <ProjectsView />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
