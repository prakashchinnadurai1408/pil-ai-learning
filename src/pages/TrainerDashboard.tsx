import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, BarChart3, ClipboardCheck, LogOut,
  TrendingUp, Eye, Loader2, Search, X, ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import pluginliveLogo from "@/assets/pluginlive-logo.png";
import { moduleNames, mcqBank } from "@/data/videoContent";
import { useTrainerData } from "@/hooks/useTrainerData";
import { StudentDetailModal } from "@/components/trainer/StudentDetailModal";
import type { StudentData } from "@/hooks/useTrainerData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const TrainerDashboard = () => {
  const { students, loading, totalStudents, avgProgress, avgOverallScore, moduleStats, scoreDistribution } = useTrainerData();
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"name" | "college" | "progress" | "modulesCompleted" | "avgScore" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const colleges = useMemo(() => [...new Set(students.map(s => s.college))].sort(), [students]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (collegeFilter !== "all" && s.college !== collegeFilter) return false;
      if (scoreFilter === "high" && s.avgScore < 80) return false;
      if (scoreFilter === "mid" && (s.avgScore < 60 || s.avgScore >= 80)) return false;
      if (scoreFilter === "low" && s.avgScore >= 60) return false;
      if (progressFilter === "above75" && s.progress < 75) return false;
      if (progressFilter === "50to75" && (s.progress < 50 || s.progress >= 75)) return false;
      if (progressFilter === "below50" && s.progress >= 50) return false;
      return true;
    });
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [students, searchQuery, collegeFilter, scoreFilter, progressFilter, sortKey, sortDir]);

  const hasFilters = searchQuery || collegeFilter !== "all" || scoreFilter !== "all" || progressFilter !== "all";
  const clearFilters = () => { setSearchQuery(""); setCollegeFilter("all"); setScoreFilter("all"); setProgressFilter("all"); };

  const exportCSV = () => {
    const headers = ["Name", "Email", "College", "Location", "Mobile", "Progress %", "Modules Completed", "Avg Score %"];
    const rows = filteredStudents.map(s => [s.name, s.email, s.college, s.location, s.mobile, s.progress, s.modulesCompleted, s.avgScore]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const assessments = Object.entries(moduleNames).map(([id, name]) => {
    const mid = Number(id);
    const qCount = mcqBank.filter((q) => q.moduleId === mid).length;
    const studentsAttempted = students.filter(s => s.moduleScores.some(ms => ms.moduleId === mid)).length;
    const scores = students.flatMap(s => s.moduleScores.filter(ms => ms.moduleId === mid).map(ms => ms.score));
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { id: mid, name, questions: qCount, attempted: studentsAttempted, avgScore, status: studentsAttempted > 0 ? "Active" : "No Data" };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={pluginliveLogo} alt="PluginLive" className="h-7" />
            <span className="font-display font-bold text-gradient-accent">Trainer Portal</span>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Students", value: String(totalStudents), icon: Users, color: "text-primary" },
            { label: "Avg Progress", value: `${avgProgress}%`, icon: TrendingUp, color: "text-success" },
            { label: "Avg Score", value: `${avgOverallScore}%`, icon: ClipboardCheck, color: "text-warning" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-card rounded-lg border border-border p-5 shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-display font-bold text-card-foreground">{stat.value}</p>
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
              <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-card-foreground">Student Progress</h3>
                  <div className="flex items-center gap-2">
                    {hasFilters && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={clearFilters}>
                        <X className="h-3 w-3" /> Clear Filters
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={exportCSV}>
                      <Download className="h-3 w-3" /> Export CSV
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      className="pl-9 h-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="College" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Colleges</SelectItem>
                      {colleges.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={scoreFilter} onValueChange={setScoreFilter}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Score Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scores</SelectItem>
                      <SelectItem value="high">80%+ (High)</SelectItem>
                      <SelectItem value="mid">60-79% (Medium)</SelectItem>
                      <SelectItem value="low">Below 60% (Low)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={progressFilter} onValueChange={setProgressFilter}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Progress" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Progress</SelectItem>
                      <SelectItem value="above75">75%+ (Ahead)</SelectItem>
                      <SelectItem value="50to75">50-74% (On Track)</SelectItem>
                      <SelectItem value="below50">Below 50% (Behind)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {hasFilters && (
                  <p className="text-xs text-muted-foreground">{filteredStudents.length} of {students.length} students shown</p>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="p-4 font-medium cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("name")}>
                        <span className="inline-flex items-center">Student <SortIcon col="name" /></span>
                      </th>
                      <th className="p-4 font-medium cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("college")}>
                        <span className="inline-flex items-center">College <SortIcon col="college" /></span>
                      </th>
                      <th className="p-4 font-medium cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("progress")}>
                        <span className="inline-flex items-center">Progress <SortIcon col="progress" /></span>
                      </th>
                      <th className="p-4 font-medium cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("modulesCompleted")}>
                        <span className="inline-flex items-center">Modules <SortIcon col="modulesCompleted" /></span>
                      </th>
                      <th className="p-4 font-medium cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("avgScore")}>
                        <span className="inline-flex items-center">Avg Score <SortIcon col="avgScore" /></span>
                      </th>
                      <th className="p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudents.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No students match your filters.</td></tr>
                    ) : null}
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
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
                            s.avgScore >= 80 ? "text-success" : s.avgScore >= 60 ? "text-warning" : "text-destructive"
                          }`}>
                            {s.avgScore}%
                          </span>
                        </td>
                        <td className="p-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs text-primary"
                            onClick={() => { setSelectedStudent(s); setDetailOpen(true); }}
                          >
                            <Eye className="h-3 w-3" /> View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Assessments Tab */}
          <TabsContent value="assessments">
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
                            {a.avgScore > 0 ? `${a.avgScore}%` : "—"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            a.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg border border-border p-5 shadow-card">
                <h4 className="font-display font-semibold mb-4 text-card-foreground">Module Enrollment vs Completion</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={moduleStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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

              <div className="bg-card rounded-lg border border-border p-5 shadow-card">
                <h4 className="font-display font-semibold mb-4 text-card-foreground">Assessment Score Distribution</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={scoreDistribution.filter(s => s.value > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {scoreDistribution.filter(s => s.value > 0).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <StudentDetailModal student={selectedStudent} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};

export default TrainerDashboard;
