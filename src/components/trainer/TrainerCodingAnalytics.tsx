import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import {
  Code2, Trophy, Search, Download, Loader2, TrendingUp, Users, Target
} from "lucide-react";

interface SolvedEntry {
  student_name: string;
  challenge_id: number;
  language: string;
  solved_at: string;
}

interface ChallengeInfo {
  id: string;
  title: string;
  difficulty: string;
  category: string;
}

const TrainerCodingAnalytics = () => {
  const [solved, setSolved] = useState<SolvedEntry[]>([]);
  const [challenges, setChallenges] = useState<ChallengeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [langFilter, setLangFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: solvedData }, { data: challengeData }] = await Promise.all([
        supabase.from("student_solved_challenges").select("*"),
        supabase.from("coding_challenges").select("id, title, difficulty, category"),
      ]);
      setSolved((solvedData as any[]) || []);
      setChallenges((challengeData as any[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const languages = useMemo(() => [...new Set(solved.map(s => s.language))].sort(), [solved]);

  const filteredSolved = useMemo(() => {
    let result = solved;
    if (langFilter !== "all") result = result.filter(s => s.language === langFilter);
    return result;
  }, [solved, langFilter]);

  // Per-student stats
  const studentStats = useMemo(() => {
    const map = new Map<string, { name: string; solved: number; languages: Set<string>; lastSolved: string }>();
    filteredSolved.forEach(s => {
      const existing = map.get(s.student_name) || { name: s.student_name, solved: 0, languages: new Set(), lastSolved: "" };
      existing.solved++;
      existing.languages.add(s.language);
      if (s.solved_at > existing.lastSolved) existing.lastSolved = s.solved_at;
      map.set(s.student_name, existing);
    });
    return Array.from(map.values())
      .filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.solved - a.solved);
  }, [filteredSolved, searchQuery]);

  // Language distribution
  const langDistribution = useMemo(() => {
    const map = new Map<string, number>();
    solved.forEach(s => map.set(s.language, (map.get(s.language) || 0) + 1));
    const colors = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--accent))", "hsl(var(--destructive))", "#8b5cf6", "#06b6d4", "#f97316"];
    return Array.from(map.entries()).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
  }, [solved]);

  // Difficulty breakdown
  const difficultyStats = useMemo(() => {
    const map = new Map<string, number>();
    solved.forEach(s => {
      const ch = challenges.find(c => String(c.id) === String(s.challenge_id));
      const diff = ch?.difficulty || "Unknown";
      map.set(diff, (map.get(diff) || 0) + 1);
    });
    return [
      { name: "Easy", count: map.get("Easy") || 0, color: "hsl(var(--success))" },
      { name: "Medium", count: map.get("Medium") || 0, color: "hsl(var(--warning))" },
      { name: "Hard", count: map.get("Hard") || 0, color: "hsl(var(--destructive))" },
    ];
  }, [solved, challenges]);

  // Most/least solved challenges
  const challengePopularity = useMemo(() => {
    const map = new Map<number, number>();
    solved.forEach(s => map.set(s.challenge_id, (map.get(s.challenge_id) || 0) + 1));
    return Array.from(map.entries())
      .map(([id, count]) => {
        const ch = challenges.find(c => String(c.id) === String(id));
        return { id, title: ch?.title || `Challenge ${id}`, count, difficulty: ch?.difficulty || "—" };
      })
      .sort((a, b) => b.count - a.count);
  }, [solved, challenges]);

  const exportCSV = () => {
    const headers = ["Student", "Challenges Solved", "Languages Used", "Last Solved"];
    const rows = studentStats.map(s => [s.name, s.solved, Array.from(s.languages).join("; "), new Date(s.lastSolved).toLocaleDateString()]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coding-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const uniqueStudents = new Set(solved.map(s => s.student_name)).size;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Submissions", value: solved.length, icon: Code2, color: "text-primary" },
          { label: "Active Coders", value: uniqueStudents, icon: Users, color: "text-success" },
          { label: "Languages Used", value: languages.length, icon: Target, color: "text-warning" },
          { label: "DB Challenges", value: challenges.length, icon: TrendingUp, color: "text-accent" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card rounded-lg border border-border p-5 shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`h-5 w-5 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-display font-bold text-card-foreground">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-5 shadow-card">
          <h4 className="font-display font-semibold mb-4 text-card-foreground">Language Distribution</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={langDistribution.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {langDistribution.filter(d => d.value > 0).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border border-border p-5 shadow-card">
          <h4 className="font-display font-semibold mb-4 text-card-foreground">Difficulty Breakdown</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={difficultyStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
              <Bar dataKey="count" name="Solved" radius={[4, 4, 0, 0]}>
                {difficultyStats.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Most Solved Challenges */}
      {challengePopularity.length > 0 && (
        <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h4 className="font-display font-semibold text-card-foreground">Most Solved Challenges</h4>
          </div>
          <div className="divide-y divide-border max-h-[250px] overflow-y-auto">
            {challengePopularity.slice(0, 10).map((ch, i) => (
              <div key={ch.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground/50 w-6">{i + 1}</span>
                  <span className="text-sm font-medium text-card-foreground">{ch.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    ch.difficulty === "Easy" ? "bg-success/10 text-success" : ch.difficulty === "Medium" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                  }`}>{ch.difficulty}</span>
                </div>
                <span className="text-sm font-medium text-primary">{ch.count} solves</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Leaderboard Table */}
      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-card-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-warning" /> Student Coding Progress
            </h4>
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={exportCSV}>
              <Download className="h-3 w-3" /> Export CSV
            </Button>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search student..." className="pl-9 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Select value={langFilter} onValueChange={setLangFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-4 font-medium w-10">#</th>
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Solved</th>
                <th className="p-4 font-medium">Languages</th>
                <th className="p-4 font-medium">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {studentStats.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No coding activity yet.</td></tr>
              ) : studentStats.map((s, i) => (
                <tr key={s.name} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    {i < 3 ? (
                      <span className={`text-lg ${i === 0 ? "text-warning" : i === 1 ? "text-muted-foreground" : "text-orange-400"}`}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{i + 1}</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                        {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-medium text-sm text-card-foreground">{s.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-semibold text-primary">{s.solved}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {Array.from(s.languages).map(l => (
                        <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{l}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">
                    {new Date(s.lastSolved).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrainerCodingAnalytics;
