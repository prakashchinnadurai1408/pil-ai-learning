import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, BarChart3, ClipboardCheck, BookOpen, LogOut,
  TrendingUp, GraduationCap, Clock, ArrowRight, Eye, Download
} from "lucide-react";
import pluginliveLogo from "@/assets/pluginlive-logo.png";
import { modules } from "@/data/modules";
import { mcqBank, moduleNames } from "@/data/videoContent";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

const students = [
  { name: "Aarav Sharma", college: "IIT Bombay", progress: 78, modulesCompleted: 7, lastActive: "2h ago", assessmentScore: 85 },
  { name: "Priya Patel", college: "VIT Vellore", progress: 65, modulesCompleted: 6, lastActive: "1h ago", assessmentScore: 72 },
  { name: "Rahul Kumar", college: "NIT Trichy", progress: 45, modulesCompleted: 4, lastActive: "3h ago", assessmentScore: 58 },
  { name: "Sneha Reddy", college: "BITS Pilani", progress: 92, modulesCompleted: 9, lastActive: "30m ago", assessmentScore: 95 },
  { name: "Amit Verma", college: "SRM University", progress: 30, modulesCompleted: 3, lastActive: "1d ago", assessmentScore: 42 },
  { name: "Kavya Nair", college: "Anna University", progress: 55, modulesCompleted: 5, lastActive: "5h ago", assessmentScore: 68 },
  { name: "Rohan Gupta", college: "IIIT Hyderabad", progress: 88, modulesCompleted: 8, lastActive: "1h ago", assessmentScore: 91 },
  { name: "Ananya Singh", college: "DTU Delhi", progress: 72, modulesCompleted: 7, lastActive: "4h ago", assessmentScore: 78 },
];

const moduleProgressData = [
  { name: "Intro to AI", enrolled: 156, completed: 132 },
  { name: "AI Tools", enrolled: 148, completed: 98 },
  { name: "Prompting", enrolled: 135, completed: 72 },
  { name: "Multimodal", enrolled: 120, completed: 55 },
  { name: "AI Agents", enrolled: 108, completed: 38 },
  { name: "LLMs", enrolled: 95, completed: 28 },
  { name: "Workflows", enrolled: 82, completed: 20 },
  { name: "RAG", enrolled: 70, completed: 15 },
  { name: "Fine-Tuning", enrolled: 58, completed: 8 },
  { name: "AI SaaS", enrolled: 45, completed: 5 },
];

const weeklyActivityData = [
  { day: "Mon", students: 89 },
  { day: "Tue", students: 112 },
  { day: "Wed", students: 98 },
  { day: "Thu", students: 134 },
  { day: "Fri", students: 78 },
  { day: "Sat", students: 45 },
  { day: "Sun", students: 32 },
];

const scoreDistribution = [
  { name: "90-100%", value: 28, color: "hsl(var(--success))" },
  { name: "70-89%", value: 52, color: "hsl(var(--primary))" },
  { name: "50-69%", value: 48, color: "hsl(var(--warning))" },
  { name: "Below 50%", value: 28, color: "hsl(var(--destructive))" },
];

const assessments = Object.entries(moduleNames).map(([id, name]) => {
  const qCount = mcqBank.filter((q) => q.moduleId === Number(id)).length;
  const attempted = Math.floor(Math.random() * 100 + 50);
  const avgScore = Math.floor(Math.random() * 30 + 60);
  return { id: Number(id), name, questions: qCount, attempted, avgScore, status: Number(id) <= 8 ? "Active" : "Draft" };
});

const TrainerDashboard = () => {
  const [selectedAssessment, setSelectedAssessment] = useState<number | null>(null);

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
            { label: "Total Students", value: "156", icon: Users, trend: "+12 this week", color: "text-primary" },
            { label: "Avg Progress", value: "62%", icon: TrendingUp, trend: "+5% this month", color: "text-success" },
            { label: "Assessments Active", value: "8", icon: ClipboardCheck, trend: "2 pending review", color: "text-warning" },
            { label: "Active Today", value: "43", icon: Clock, trend: "28% engagement", color: "text-accent" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-card rounded-lg border border-border p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
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

          {/* Students Tab */}
          <TabsContent value="students">
            <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-display font-semibold text-card-foreground">Student Progress</h3>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-3 w-3" /> Export
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="p-4 font-medium">Student</th>
                      <th className="p-4 font-medium">College</th>
                      <th className="p-4 font-medium">Progress</th>
                      <th className="p-4 font-medium">Modules</th>
                      <th className="p-4 font-medium">Avg Score</th>
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
                        <td className="p-4">
                          <span className={`text-sm font-medium ${
                            s.assessmentScore >= 80 ? "text-success" : s.assessmentScore >= 60 ? "text-warning" : "text-destructive"
                          }`}>
                            {s.assessmentScore}%
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{s.lastActive}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Assessments Tab */}
          <TabsContent value="assessments">
            <div className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: "Total Assessments", value: "10", icon: ClipboardCheck, color: "text-primary" },
                  { label: "Total Questions", value: String(mcqBank.length), icon: BookOpen, color: "text-warning" },
                  { label: "Avg Completion", value: "74%", icon: TrendingUp, color: "text-success" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="bg-card rounded-lg border border-border p-5 shadow-card flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xl font-display font-bold text-card-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-display font-semibold text-card-foreground">Assessment Overview</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="p-4 font-medium">Module</th>
                        <th className="p-4 font-medium">Questions</th>
                        <th className="p-4 font-medium">Attempted By</th>
                        <th className="p-4 font-medium">Avg Score</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {assessments.map((a) => (
                        <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-muted-foreground/50 font-display w-6">
                                {String(a.id).padStart(2, "0")}
                              </span>
                              <span className="font-medium text-sm text-card-foreground">{a.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{a.questions}</td>
                          <td className="p-4 text-sm text-muted-foreground">{a.attempted} students</td>
                          <td className="p-4">
                            <span className={`text-sm font-medium ${
                              a.avgScore >= 75 ? "text-success" : a.avgScore >= 60 ? "text-warning" : "text-destructive"
                            }`}>
                              {a.avgScore}%
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              a.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                            }`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
                              <Eye className="h-3 w-3" /> View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Module Progress Chart */}
                <div className="bg-card rounded-lg border border-border p-5 shadow-card">
                  <h4 className="font-display font-semibold mb-4 text-card-foreground">Module Enrollment vs Completion</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={moduleProgressData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                      <Legend />
                      <Bar dataKey="enrolled" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Enrolled" />
                      <Bar dataKey="completed" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Score Distribution */}
                <div className="bg-card rounded-lg border border-border p-5 shadow-card">
                  <h4 className="font-display font-semibold mb-4 text-card-foreground">Assessment Score Distribution</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={scoreDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {scoreDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Weekly Activity */}
                <div className="bg-card rounded-lg border border-border p-5 shadow-card lg:col-span-2">
                  <h4 className="font-display font-semibold mb-4 text-card-foreground">Weekly Student Activity</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={weeklyActivityData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                      <Line type="monotone" dataKey="students" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 5 }} name="Active Students" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TrainerDashboard;
