import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { modules } from "@/data/modules";
import { useAdminModules } from "@/hooks/useAdminModules";
import { useStudentLearningPaths } from "@/hooks/useLearningPaths";
import {
  BookOpen, MessageSquare, FlaskConical, ClipboardCheck,
  FolderKanban, LogOut, CheckCircle, Code2, Pencil,
  Lock, Crown, User, LayoutDashboard, CreditCard, Route, Layers,
  Library, BarChart3, ShieldCheck,
} from "lucide-react";
import pluginliveLogo from "@/assets/ai-upskill-hub-logo.png";
import { getMenuAccess, isAllowed, TIER_META, TIERS, type MenuAccessConfig, type Tier } from "@/hooks/useMenuAccessControls";
import ErrorBoundary from "@/components/ErrorBoundary";
import { toast } from "sonner";
import NotificationsPanel from "@/components/dashboard/NotificationsPanel";
import PracticeModeBanner from "@/components/dashboard/PracticeModeBanner";
import { ContentSkeleton } from "@/components/LoadingFallback";

const AIPlayground = lazy(() => import("@/components/dashboard/AIPlayground"));
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
const MyTrainerCurricula = lazy(() => import("@/components/dashboard/MyTrainerCurricula"));
const QuestionBankViewer = lazy(() => import("@/components/admin/QuestionBankViewer"));
const StudentAssessmentsAnalytics = lazy(() => import("@/components/dashboard/StudentAssessmentsAnalytics"));
const StudentProctoringAnalytics = lazy(() => import("@/components/dashboard/StudentProctoringAnalytics"));
const StudentProjectsAnalytics = lazy(() => import("@/components/dashboard/StudentProjectsAnalytics"));
const StudentOverview = lazy(() => import("@/components/dashboard/StudentOverview"));
const OnboardingChecklist = lazy(() => import("@/components/dashboard/OnboardingChecklist"));
const PerfMetricsPanel = lazy(() => import("@/components/dashboard/PerfMetricsPanel"));
const RagStudySandbox = lazy(() => import("@/components/dashboard/RagStudySandbox"));
const VideoQuizSandbox = lazy(() => import("@/components/dashboard/VideoQuizSandbox"));
const PracticePlanWidget = lazy(() => import("@/components/dashboard/PracticePlanWidget"));
import SectionPerf from "@/components/dashboard/SectionPerf";

type TabKey =
  | "overview" | "subscription"
  | "ai_path" | "module_groups" | "trainer_curricula" | "modules"
  | "playground" | "tools" | "question_bank" | "coding" | "prompts" | "rag_sandbox" | "video_quiz"
  | "assessments" | "projects"
  | "analytics_assessments" | "analytics_proctoring" | "analytics_projects";

const SECTIONS: { label: string; items: { key: TabKey; label: string; icon: typeof BookOpen }[] }[] = [
  { label: "Account", items: [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "subscription", label: "Subscriptions Status", icon: CreditCard },
  ]},
  { label: "Learn", items: [
    { key: "ai_path", label: "Learning Paths", icon: Route },
    { key: "module_groups", label: "Module Groups", icon: Layers },
    { key: "trainer_curricula", label: "Trainer Curricula", icon: BookOpen },
    { key: "modules", label: "Modules & Videos", icon: BookOpen },
  ]},
  { label: "Practice", items: [
    { key: "playground", label: "Section Content – AI Chat", icon: MessageSquare },
    { key: "tools", label: "Section Content – AI Tools", icon: FlaskConical },
    { key: "question_bank", label: "Question Bank", icon: Library },
    { key: "coding", label: "Coding Challenges", icon: Code2 },
    { key: "prompts", label: "Prompts", icon: Pencil },
    { key: "rag_sandbox", label: "RAG Study Sandbox", icon: Library },
    { key: "video_quiz", label: "Video → Quiz", icon: BookOpen },
  ]},
  { label: "Assessments", items: [
    { key: "assessments", label: "Assessments", icon: ClipboardCheck },
    { key: "projects", label: "Projects", icon: FolderKanban },
  ]},
  { label: "Analytics", items: [
    { key: "analytics_assessments", label: "Assessments", icon: BarChart3 },
    { key: "analytics_proctoring", label: "Proctoring", icon: ShieldCheck },
    { key: "analytics_projects", label: "Projects", icon: FolderKanban },
  ]},
];

const StudentSidebar = ({
  active, onSelect, menuAccess, userTier, onLockedClick,
}: {
  active: TabKey;
  onSelect: (k: TabKey) => void;
  menuAccess: MenuAccessConfig;
  userTier: Tier;
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
                  const isLocked = !isAllowed(menuAccess, item.key, userTier);
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

const normalizeTier = (raw: any): Tier => {
  const v = String(raw || "free").toLowerCase();
  if (v === "premium") return "advanced"; // legacy compat
  if ((TIERS as string[]).includes(v)) return v as Tier;
  return "free";
};

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
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
  const [userTier, setUserTier] = useState<Tier>("free");
  const [menuAccess, setMenuAccess] = useState<MenuAccessConfig>({});

  useEffect(() => {
    getMenuAccess("student").then(setMenuAccess);
    if (studentId) {
      supabase.from("students").select("subscription_tier, college, department, degree, age_group").eq("id", studentId).single()
        .then(({ data }) => {
          if (data?.subscription_tier) setUserTier(normalizeTier(data.subscription_tier));
          if (data?.college) sessionStorage.setItem("studentCollege", data.college);
          if (data?.department) sessionStorage.setItem("studentDepartment", data.department);
          if ((data as any)?.age_group) sessionStorage.setItem("studentAgeGroup", (data as any).age_group);
          if (data?.degree) sessionStorage.setItem("studentDegree", data.degree);
        });
    }
  }, [studentId]);

  const { allowedModuleIds, pathNames } = useStudentLearningPaths(studentCollege, studentDepartment, studentDegree, userTier === "free" ? "free" : "premium");

  const filteredModules = allowedModuleIds === null ? modules : modules.filter((m) => allowedModuleIds.includes(m.id));
  const filteredAdminModules = allowedModuleIds === null ? publishedAdminModules : publishedAdminModules.filter((m) => allowedModuleIds.includes(m.id));

  // Header gates for non-sidebar buttons
  const showNotifications = isAllowed(menuAccess, "notifications", userTier);
  const showProfileBtn = isAllowed(menuAccess, "profile", userTier);

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
      case "overview":
        return (
          <Suspense fallback={<ContentSkeleton />}>
            <StudentOverview
              studentId={studentId}
              studentName={studentName}
              studentCollege={studentCollege}
              studentDepartment={studentDepartment}
              studentDegree={studentDegree}
              userTier={userTier}
              onNavigate={(tab, moduleId) => {
                setActiveTab(tab as TabKey);
                setSelectedModuleId(moduleId ?? null);
              }}
            />
          </Suspense>
        );
      case "subscription":
        return (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-display font-bold text-card-foreground">Your Subscription</h2>
                  <p className="text-sm text-muted-foreground">Current plan and what's included.</p>
                </div>
                <Badge className={`${TIER_META[userTier].color} border-current text-base px-3 py-1`} variant="outline">
                  <Crown className="h-4 w-4 mr-1.5" /> {TIER_META[userTier].label} · {TIER_META[userTier].price}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{TIER_META[userTier].tagline}</p>
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-display font-semibold mb-2 text-card-foreground">Menu access on your plan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SECTIONS.flatMap(s => s.items).map(i => {
                    const allowed = isAllowed(menuAccess, i.key, userTier);
                    return (
                      <div key={i.key} className="flex items-center gap-2 text-sm">
                        {allowed
                          ? <CheckCircle className="h-4 w-4 text-success" />
                          : <Lock className="h-4 w-4 text-muted-foreground" />}
                        <span className={allowed ? "text-card-foreground" : "text-muted-foreground line-through"}>{i.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Button className="bg-warning text-warning-foreground hover:bg-warning/90 gap-2" onClick={() => setUpgradeDialogOpen(true)}>
                <Crown className="h-4 w-4" /> View Upgrade Options
              </Button>
            </CardContent>
          </Card>
        );
      case "ai_path":
        return studentId ? (
          <Suspense fallback={<ContentSkeleton />}>
            <MyAILearningPath candidateId={studentId} onOpenModule={(id) => { setActiveTab("modules"); setSelectedModuleId(id); }} />
          </Suspense>
        ) : null;
      case "module_groups":
        return studentId ? (
          <Suspense fallback={<ContentSkeleton />}>
            <MyModuleGroups studentId={studentId} college={studentCollege} department={studentDepartment} degree={studentDegree}
              onOpenModule={(id) => { setActiveTab("modules"); setSelectedModuleId(id); }} />
          </Suspense>
        ) : null;
      case "trainer_curricula":
        return studentId ? (
          <Suspense fallback={<ContentSkeleton />}>
            <MyTrainerCurricula studentId={studentId} studentName={studentName} college={studentCollege} department={studentDepartment} degree={studentDegree} />
          </Suspense>
        ) : null;
      case "modules":
        return selectedModuleId ? (
          <ErrorBoundary>
            <Suspense fallback={<ContentSkeleton />}>
              <ModuleDetailView moduleId={selectedModuleId} onBack={() => setSelectedModuleId(null)} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <div className="space-y-4">
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
      case "playground":
        return <Suspense fallback={<ContentSkeleton />}><AIPlayground /></Suspense>;
      case "tools":
        return <Suspense fallback={<ContentSkeleton />}><AIToolsSandbox /></Suspense>;
      case "question_bank":
        return <Suspense fallback={<ContentSkeleton />}><QuestionBankViewer /></Suspense>;
      case "coding":
        return <Suspense fallback={<ContentSkeleton />}><ProgrammingModule /></Suspense>;
      case "prompts":
        return <Suspense fallback={<ContentSkeleton />}><PromptEngineeringLab /></Suspense>;
      case "rag_sandbox":
        return <Suspense fallback={<ContentSkeleton />}><RagStudySandbox /></Suspense>;
      case "video_quiz":
        return <Suspense fallback={<ContentSkeleton />}><VideoQuizSandbox /></Suspense>;
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
      case "analytics_assessments":
        return <Suspense fallback={<ContentSkeleton />}><StudentAssessmentsAnalytics studentId={studentId} /></Suspense>;
      case "analytics_proctoring":
        return <Suspense fallback={<ContentSkeleton />}><StudentProctoringAnalytics studentId={studentId} /></Suspense>;
      case "analytics_projects":
        return <Suspense fallback={<ContentSkeleton />}><StudentProjectsAnalytics studentId={studentId} studentName={studentName} /></Suspense>;
      default:
        return null;
    }
  };

  // Build dynamic comparison rows from current access controls (used in upgrade dialog)
  const upgradeRows = Object.entries(menuAccess).map(([key, perTier]) => ({ key, perTier }));

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
                <img src={pluginliveLogo} alt="AI Upskill Hub Logo" className="h-7" />
                <span className="font-display font-bold text-gradient-primary">AI Upskill Hub</span>
                <Badge variant="outline" className={`ml-2 ${TIER_META[userTier].color} border-current`}>
                  {TIER_META[userTier].label}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {showNotifications && <NotificationsPanel studentId={null} />}
                {showProfileBtn && (
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setShowProfile(true)}>
                    <User className="h-4 w-4" /> <span className="hidden sm:inline">{studentName}</span>
                  </Button>
                )}
                <Link to="/student-login" onClick={() => sessionStorage.clear()}>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                    <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-8" role="main">
            <div className="mb-4"><PracticeModeBanner /></div>
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

                {studentId && activeTab === "overview" && (
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

                {studentId && activeTab === "overview" && (
                  <div className="mb-8">
                    <Suspense fallback={<ContentSkeleton />}>
                      <PracticePlanWidget
                        studentId={studentId}
                        studentName={studentName}
                        onNavigate={(tool) => {
                          const t = tool.toLowerCase();
                          if (t.includes("playground") || t.includes("chat")) setActiveTab("playground");
                          else if (t.includes("prompt")) setActiveTab("prompts");
                          else if (t.includes("tool")) setActiveTab("tools");
                          else if (t.includes("cod")) setActiveTab("coding");
                        }}
                      />
                    </Suspense>
                  </div>
                )}

                {studentId && activeTab === "overview" && (
                  <div className="mb-8 grid gap-6 lg:grid-cols-2">
                    <Suspense fallback={<ContentSkeleton />}>
                      <OnboardingChecklist
                        studentId={studentId}
                        studentCollege={studentCollege}
                        studentDepartment={studentDepartment}
                        studentDegree={studentDegree}
                        onNavigate={(tab) => { setActiveTab(tab as TabKey); setSelectedModuleId(null); }}
                        onOpenProfile={() => setShowProfile(true)}
                      />
                    </Suspense>
                    <Suspense fallback={<ContentSkeleton />}>
                      <PerfMetricsPanel />
                    </Suspense>
                  </div>
                )}

                {pathNames.length > 0 && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span>Your learning paths: <strong className="text-foreground">{pathNames.join(", ")}</strong></span>
                  </div>
                )}

                <SectionPerf key={activeTab} section={activeTab} />
                <ErrorBoundary>{renderActive()}</ErrorBoundary>
              </>
            )}
          </main>
        </div>

        <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-warning" /> Upgrade Your Plan
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-medium text-muted-foreground">Feature</th>
                    {TIERS.map((t) => (
                      <th key={t} className={`p-2 text-center font-display ${TIER_META[t].color} ${t === userTier ? "bg-muted/50 rounded-t" : ""}`}>
                        {TIER_META[t].label}<br /><span className="text-[10px] text-muted-foreground font-normal">{TIER_META[t].price}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {upgradeRows.map(({ key, perTier }) => (
                    <tr key={key} className="border-b border-border/30">
                      <td className="p-2 text-card-foreground">{key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</td>
                      {TIERS.map((t) => (
                        <td key={t} className={`p-2 text-center ${t === userTier ? "bg-muted/30" : ""}`}>
                          {perTier[t]
                            ? <CheckCircle className="h-3.5 w-3.5 text-success mx-auto" />
                            : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)} className="flex-1">Maybe Later</Button>
              <Button className="flex-1 bg-warning text-warning-foreground hover:bg-warning/90 gap-2" onClick={() => {
                setUpgradeDialogOpen(false);
                toast.info("Contact your administrator to upgrade your subscription.");
              }}>
                <Crown className="h-4 w-4" /> Contact Admin to Upgrade
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};

export default StudentDashboard;
