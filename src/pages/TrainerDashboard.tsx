import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, BarChart3, ClipboardCheck, BookOpen, LogOut,
  TrendingUp, GraduationCap, Clock
} from "lucide-react";
import pluginliveLogo from "@/assets/pluginlive-logo.png";

const students = [
  { name: "Aarav Sharma", college: "IIT Bombay", progress: 78, modulesCompleted: 7, lastActive: "2h ago" },
  { name: "Priya Patel", college: "VIT Vellore", progress: 65, modulesCompleted: 6, lastActive: "1h ago" },
  { name: "Rahul Kumar", college: "NIT Trichy", progress: 45, modulesCompleted: 4, lastActive: "3h ago" },
  { name: "Sneha Reddy", college: "BITS Pilani", progress: 92, modulesCompleted: 9, lastActive: "30m ago" },
  { name: "Amit Verma", college: "SRM University", progress: 30, modulesCompleted: 3, lastActive: "1d ago" },
  { name: "Kavya Nair", college: "Anna University", progress: 55, modulesCompleted: 5, lastActive: "5h ago" },
];

const TrainerDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={pluginliveLogo} alt="PluginLive" className="h-7" />
            <span className="font-display font-bold text-gradient-accent">Trainer Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">Prof. Trainer</span>
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Students", value: "156", icon: Users, trend: "+12 this week" },
            { label: "Avg Progress", value: "62%", icon: TrendingUp, trend: "+5% this month" },
            { label: "Assessments Created", value: "8", icon: ClipboardCheck, trend: "2 pending review" },
            { label: "Active Today", value: "43", icon: Clock, trend: "28% engagement" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-card rounded-lg border border-border p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-xs text-muted-foreground">{stat.trend}</span>
                </div>
                <p className="text-2xl font-display font-bold text-card-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <Tabs defaultValue="students">
          <TabsList className="mb-8 bg-muted p-1">
            <TabsTrigger value="students" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" /> Students
            </TabsTrigger>
            <TabsTrigger value="assessments" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <ClipboardCheck className="h-4 w-4" /> Assessments
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-display font-semibold text-card-foreground">Student Progress</h3>
                <Button variant="outline" size="sm">Export</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="p-4 font-medium">Student</th>
                      <th className="p-4 font-medium">College</th>
                      <th className="p-4 font-medium">Progress</th>
                      <th className="p-4 font-medium">Modules</th>
                      <th className="p-4 font-medium">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {students.map((s) => (
                      <tr key={s.name} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                              {s.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <span className="font-medium text-sm text-card-foreground">{s.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{s.college}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Progress value={s.progress} className="h-1.5 w-24" />
                            <span className="text-xs font-medium text-card-foreground">{s.progress}%</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{s.modulesCompleted}/10</td>
                        <td className="p-4 text-sm text-muted-foreground">{s.lastActive}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assessments">
            <div className="bg-card rounded-lg border border-border p-8 text-center shadow-card">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-display font-semibold text-lg mb-2 text-card-foreground">Assessment Management</h3>
              <p className="text-muted-foreground text-sm mb-4">Create MCQ tests, prompt design tasks, and AI problem-solving assessments for your students</p>
              <Button className="bg-gradient-accent border-0 text-accent-foreground">Create Assessment</Button>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="bg-card rounded-lg border border-border p-8 text-center shadow-card">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-display font-semibold text-lg mb-2 text-card-foreground">Analytics Dashboard</h3>
              <p className="text-muted-foreground text-sm mb-4">View student progress, course completion rates, assessment scores, and engagement metrics</p>
              <Button className="bg-gradient-accent border-0 text-accent-foreground">Coming Soon</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TrainerDashboard;
