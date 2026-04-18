import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { modules } from "@/data/modules";
import { useAdminModules } from "@/hooks/useAdminModules";
import { useStudentLearningPaths } from "@/hooks/useLearningPaths";
import {
  BookOpen, MessageSquare, Video, FlaskConical, ClipboardCheck,
  FolderKanban, LogOut, Play, CheckCircle, Sparkles, Code2, Pencil,
  Lock, Crown, User,
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
const MyAILearningPath = lazy(() => import("@/components/dashboard/MyAILearningPath"));
const StudentModulesView = lazy(() => import("@/components/dashboard/StudentModulesView"));
const MyAssignedProjects = lazy(() => import("@/components/dashboard/MyAssignedProjects"));
const MyModuleGroups = lazy(() => import("@/components/dashboard/MyModuleGroups"));

type TabKey = keyof MenuAccessConfig;

const SECTIONS: { label: string; items: { key: TabKey; label: string; icon: typeof BookOpen }[] }[] = [
  {
    label: "Learn",
    items: [
      { key: "modules", label: "Modules", icon: BookOpen },
    ],
  },
  {
    label: "Practice",
    items: [
      { key: "playground", label: "AI Chat", icon: MessageSquare },
      { key: "coding", label: "Coding", icon: Code2 },
      { key: "prompts", label: "Prompts", icon: Pencil },
      { key: "tools", label: "AI Tools", icon: FlaskConical },
    ],
  },
  {
    label: "Progress",
    items: [
      { key: "assessments", label: "Assessments", icon: ClipboardCheck },
      { key: "projects", label: "Projects", icon: FolderKanban },
    ],
  },
];

const StudentSidebar = ({
  active, onSelect, menuAccess, userTier, onLockedClick,
}: {
  active: TabKey;
  onSelect: (k: TabKey) => void;
  menuAccess: MenuAccessConfig;
  userTier: "free" | "premium";
  onLockedClick: () => void;
}) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {SECTIONS.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isLocked = menuAccess[item.key]?.[userTier] === false;
                  const isActive = active === item.key;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        onClick={() => (isLocked ? onLockedClick() : onSelect(item.key))}
                        className={isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}
                      >
                        {isLocked ? <Lock className="mr-2 h-4 w-4 text-muted-foreground" /> : <Icon className="mr-2 h-4 w-4" />}
                        {!collapsed && <span>{item.label}{isLocked ? " 🔒" : ""}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
};

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("modules");
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const { adminModules } = useAdminModules();
  const publishedAdminModules = adminModules.filter((m) => m.status === "published");
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

  const filteredModules = allowedModuleIds === null ? modules : modules.filter((m) => allowedModuleIds.includes(m.id));
  const filteredAdminModules = allowedModuleIds === null ? publishedAdminModules : publishedAdminModules.filter((m) => allowedModuleIds.includes(m.id));

  const renderActive = () => {
    switch (activeTab) {
      case "modules":
        return selectedModuleId ? (
          <ErrorBoundary>
            <Suspense fallback={<ContentSkeleton />}>
              <ModuleDetailView moduleId={selectedModuleId} onBack={() => setSelectedModuleId(null)} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <div className="space-y-4">
            {studentId && (
              <Suspense fallback={null}>
                <MyModuleGroups
                  studentId={studentId}
                  college={studentCollege}
                  department={studentDepartment}
                  degree={studentDegree}
                  onOpenModule={(id) => setSelectedModuleId(id)}
                />
              </Suspense>
            )}
            <Suspense fallback={<ContentSkeleton />}>
              <StudentModulesView
                studentId={studentId}
                college={studentCollege}
                department={studentDepartment}
                degree={studentDegree}
                filteredModules={filteredModules}
                filteredAdminModules={filteredAdminModules}
                onOpenModule={(id) => setSelectedModuleId(id)}
              />
            </Suspense>
          </div>
        );
      case "videos":
        return <Suspense fallback={<ContentSkeleton />}><VideoLearning /></Suspense>;
      case "playground":
        return <Suspense fallback={<ContentSkeleton />}><AIPlayground /></Suspense>;
      case "coding":
        return <Suspense fallback={<ContentSkeleton />}><ProgrammingModule /></Suspense>;
      case "prompts":
        return <Suspense fallback={<ContentSkeleton />}><PromptEngineeringLab /></Suspense>;
      case "tools":
        return <Suspense fallback={<ContentSkeleton />}><AIToolsSandbox /></Suspense>;
      case "assessments":
        return (
          <>
            <Suspense fallback={<ContentSkeleton />}><StudentAssessmentTaker /></Suspense>
            <div className="mt-8 border-t border-border pt-6">
              <h3 className="text-sm font-display font-semibold text-muted-foreground mb-4">Practice Quizzes (Module-based)</h3>
              <Suspense fallback={<ContentSkeleton />}><AssessmentsView /></Suspense>
            </div>
          </>
        );
      case "projects":
        return (
          <div className="space-y-4">
            {studentId && (
              <Suspense fallback={null}><MyAssignedProjects studentId={studentId} /></Suspense>
            )}
            <Suspense fallback={<ContentSkeleton />}><ProjectsView /></Suspense>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StudentSidebar
          active={activeTab}
          onSelect={(k) => { setActiveTab(k); setSelectedModuleId(null); setShowProfile(false); }}
          menuAccess={menuAccess}
          userTier={userTier}
          onLockedClick={() => setUpgradeDialogOpen(true)}
        />

        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-50 glass border-b border-border/50">
            <div className="px-6 h-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <img src={pluginliveLogo} alt="PluginLive Logo" className="h-7" />
                <span className="font-display font-bold text-gradient-primary">AI LearnHub</span>
              </div>
              <div className="flex items-center gap-2">
                <NotificationsPanel studentId={null} />
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setShowProfile(true)}>
                  <User className="h-4 w-4" /> <span className="hidden sm:inline">{studentName}</span>
                </Button>
                <Link to="/student-login" onClick={() => sessionStorage.clear()}>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                    <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-8" role="main">
            {showProfile ? (
              <ErrorBoundary>
                <Suspense fallback={<ContentSkeleton />}>
                  <StudentProfilePage onBack={() => setShowProfile(false)} />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <>
                <div className="bg-card rounded-lg border border-border p-6 shadow-card mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h1 className="text-2xl font-display font-bold text-card-foreground">Your Learning Dashboard</h1>
                      <p className="text-muted-foreground text-sm">Track your AI learning journey</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-display font-bold text-primary">{overallProgress}%</p>
                      <p className="text-xs text-muted-foreground">Overall Progress</p>
                    </div>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>

                {studentId && (
                  <div className="mb-8">
                    <ErrorBoundary>
                      <Suspense fallback={<ContentSkeleton />}>
                        <AICoachWidget
                          studentId={studentId}
                          studentName={studentName}
                          onOpenChat={() => setActiveTab("playground")}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}

                {studentId && activeTab === "modules" && !selectedModuleId && (
                  <div className="mb-8">
                    <ErrorBoundary>
                      <Suspense fallback={<ContentSkeleton />}>
                        <MyAILearningPath
                          candidateId={studentId}
                          onOpenModule={(id) => setSelectedModuleId(id)}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}

                {pathNames.length > 0 && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span>Your learning paths: <strong className="text-foreground">{pathNames.join(", ")}</strong></span>
                  </div>
                )}

                <ErrorBoundary>
                  {renderActive()}
                </ErrorBoundary>
              </>
            )}
          </main>
        </div>

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
      </div>
    </SidebarProvider>
  );
};

export default StudentDashboard;
