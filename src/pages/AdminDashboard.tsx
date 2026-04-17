import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Users, BookOpen, CreditCard, LogOut, Shield, Layers, Database, Code2,
  LayoutDashboard, ClipboardCheck, BarChart3, Eye, FolderKanban, Route,
  Brain, Activity,
} from "lucide-react";
import pluginliveLogo from "@/assets/pluginlive-logo.png";

const UserManagement = lazy(() => import("@/components/admin/UserManagement"));
const AIModuleCreator = lazy(() => import("@/components/admin/AIModuleCreator"));
const SubscriptionManagement = lazy(() => import("@/components/admin/SubscriptionManagement"));
const ContentManager = lazy(() => import("@/components/admin/ContentManager"));
const QuestionBankViewer = lazy(() => import("@/components/admin/QuestionBankViewer"));
const CodingChallengeManager = lazy(() => import("@/components/admin/CodingChallengeManager"));
const DashboardOverview = lazy(() => import("@/components/admin/DashboardOverview"));
const AssessmentCreator = lazy(() => import("@/components/admin/AssessmentCreator"));
const AssessmentAnalytics = lazy(() => import("@/components/admin/AssessmentAnalytics"));
const ProctoringAnalytics = lazy(() => import("@/components/admin/ProctoringAnalytics"));
const TrainerProjectReview = lazy(() => import("@/components/trainer/TrainerProjectReview"));
const LearningPathsManager = lazy(() => import("@/components/admin/LearningPathsManager"));
const LLMSettings = lazy(() => import("@/components/admin/LLMSettings"));
const LLMUsageAnalytics = lazy(() => import("@/components/admin/LLMUsageAnalytics"));

const TabSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 bg-muted rounded-lg" />
      ))}
    </div>
    <div className="h-64 bg-muted rounded-lg" />
  </div>
);

type MenuItem = { key: string; label: string; icon: typeof Users; component: React.ComponentType };

const SECTIONS: { label: string; items: MenuItem[] }[] = [
  {
    label: "Overview",
    items: [
      { key: "overview", label: "Overview", icon: LayoutDashboard, component: DashboardOverview },
    ],
  },
  {
    label: "Manage",
    items: [
      { key: "users", label: "Users", icon: Users, component: UserManagement },
      { key: "subscriptions", label: "Subscriptions", icon: CreditCard, component: SubscriptionManagement },
      { key: "learning-paths", label: "Learning Paths", icon: Route, component: LearningPathsManager },
    ],
  },
  {
    label: "Content",
    items: [
      { key: "modules", label: "Modules", icon: BookOpen, component: AIModuleCreator },
      { key: "content", label: "Section Content", icon: Layers, component: ContentManager },
      { key: "question-bank", label: "Question Bank", icon: Database, component: QuestionBankViewer },
      { key: "coding", label: "Coding Challenges", icon: Code2, component: CodingChallengeManager },
      { key: "assessments", label: "Assessments", icon: ClipboardCheck, component: AssessmentCreator },
    ],
  },
  {
    label: "Analytics",
    items: [
      { key: "assessment-analytics", label: "Assessments", icon: BarChart3, component: AssessmentAnalytics },
      { key: "proctoring", label: "Proctoring", icon: Eye, component: ProctoringAnalytics },
      { key: "projects", label: "Projects", icon: FolderKanban, component: TrainerProjectReview },
      { key: "llm-usage", label: "LLM Usage", icon: Activity, component: LLMUsageAnalytics },
    ],
  },
  {
    label: "System",
    items: [
      { key: "llm-settings", label: "LLM Settings", icon: Brain, component: LLMSettings },
    ],
  },
];

const ALL_ITEMS: MenuItem[] = SECTIONS.flatMap((s) => s.items);

const AdminSidebar = ({ active, onChange }: { active: string; onChange: (k: string) => void }) => {
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
                  const isActive = active === item.key;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        onClick={() => onChange(item.key)}
                        className={isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.label}</span>}
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

const AdminDashboard = () => {
  const [active, setActive] = useState("overview");
  const ActiveComponent = ALL_ITEMS.find((m) => m.key === active)?.component ?? DashboardOverview;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar active={active} onChange={setActive} />

        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-50 glass border-b border-border/50">
            <div className="px-6 h-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <img src={pluginliveLogo} alt="PluginLive" className="h-7" />
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-gradient-primary">Admin Panel</span>
                </div>
              </div>
              <Link to="/admin-login" onClick={() => sessionStorage.clear()}>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <LogOut className="h-4 w-4" /> Logout
                </Button>
              </Link>
            </div>
          </header>

          <main className="flex-1 px-6 py-8">
            <div className="mb-6">
              <h1 className="text-2xl font-display font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Manage users, content, analytics, and AI configuration
              </p>
            </div>

            <Suspense fallback={<TabSkeleton />}>
              <ActiveComponent />
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
