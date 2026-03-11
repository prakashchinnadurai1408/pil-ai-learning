import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { modules } from "@/data/modules";
import {
  BookOpen, MessageSquare, Video, FlaskConical, ClipboardCheck,
  FolderKanban, BarChart3, LogOut, Play, CheckCircle, Lock
} from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import AIPlayground from "@/components/dashboard/AIPlayground";
import VideoLearning from "@/components/dashboard/VideoLearning";
import AssessmentsView from "@/components/dashboard/AssessmentsView";

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState("modules");
  const overallProgress = 28;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="AI LearnHub" className="h-7 w-7" />
            <span className="font-display font-bold text-gradient-primary">AI LearnHub</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">Welcome, Student</span>
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Progress Overview */}
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 mb-8 h-auto gap-1 bg-muted p-1">
            {[
              { value: "modules", icon: BookOpen, label: "Modules" },
              { value: "videos", icon: Video, label: "Videos" },
              { value: "playground", icon: MessageSquare, label: "AI Chat" },
              { value: "tools", icon: FlaskConical, label: "Tools" },
              { value: "assessments", icon: ClipboardCheck, label: "Assess" },
              { value: "projects", icon: FolderKanban, label: "Projects" },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="modules">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {modules.map((mod, i) => {
                const Icon = mod.icon;
                const isCompleted = i < 2;
                const isActive = i === 2;
                const isLocked = i > 3;
                const progress = isCompleted ? 100 : isActive ? 45 : i === 3 ? 10 : 0;

                return (
                  <div
                    key={mod.id}
                    className={`relative bg-card rounded-lg border p-5 shadow-card transition-all hover:shadow-elevated ${
                      isLocked ? "opacity-60" : ""
                    } ${isActive ? "border-primary ring-1 ring-primary/20" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      {isCompleted && <CheckCircle className="h-5 w-5 text-success" />}
                      {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                      {isActive && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          In Progress
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-semibold mb-1 text-card-foreground">{mod.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{mod.description}</p>
                    <Progress value={progress} className="h-1.5 mb-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{progress}% complete</span>
                      {!isLocked && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary">
                          <Play className="h-3 w-3" /> {isCompleted ? "Review" : "Continue"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="videos">
            <VideoLearning />
          </TabsContent>

          <TabsContent value="playground">
            <AIPlayground />
          </TabsContent>

          <TabsContent value="tools">
            <div className="bg-card rounded-lg border border-border p-8 text-center shadow-card">
              <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-display font-semibold text-lg mb-2 text-card-foreground">AI Tools Sandbox</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Experiment with image generation, code generation, text summarization & AI research queries
              </p>
              <Button className="bg-gradient-primary border-0 text-primary-foreground">Coming Soon</Button>
            </div>
          </TabsContent>

          <TabsContent value="assessments">
            <AssessmentsView />
          </TabsContent>

          <TabsContent value="projects">
            <div className="bg-card rounded-lg border border-border p-8 text-center shadow-card">
              <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-display font-semibold text-lg mb-2 text-card-foreground">AI Projects</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Build AI study assistants, chatbots, content generators & more. Submit your projects for review.
              </p>
              <Button className="bg-gradient-primary border-0 text-primary-foreground">Coming Soon</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;
