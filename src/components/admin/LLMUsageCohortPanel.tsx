import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare, Wrench, Sparkles, Code2, BookOpen, ClipboardCheck } from "lucide-react";

type Scope = { type: "all" | "college" | "cohort"; college?: string; degree?: string; department?: string };

interface UsageRow { user_id: string; feature: string; created_at: string; }

const FEATURES = [
  { key: "chat", label: "AI Chat", icon: MessageSquare, match: (f: string) => f === "chat" },
  { key: "tools", label: "AI Tools", icon: Wrench, match: (f: string) => f.startsWith("tool_") || f.startsWith("tool-") },
  { key: "prompt_lab", label: "Prompt Lab", icon: Sparkles, match: (f: string) => f === "prompt_lab" },
  { key: "coding", label: "Coding (AI)", icon: Code2, match: (f: string) => f.includes("cod") },
  { key: "quiz", label: "Quiz Gen", icon: ClipboardCheck, match: (f: string) => f.includes("quiz") },
  { key: "other", label: "Other", icon: BookOpen, match: () => true },
];

const Sparkline = ({ data, color = "hsl(var(--primary))" }: { data: number[]; color?: string }) => {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-[2px] h-8 mt-2">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm transition-all"
          style={{ height: `${Math.max(8, (v / max) * 100)}%`, background: color, opacity: v === 0 ? 0.2 : 0.85 }}
          title={`Day ${i + 1}: ${v}`} />
      ))}
    </div>
  );
};

const LLMUsageCohortPanel = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [logs, setLogs] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>({ type: "all" });

  useEffect(() => {
    (async () => {
      const [s, l] = await Promise.all([
        supabase.from("students").select("id,name,college,degree,department"),
        supabase.from("llm_usage_logs").select("user_id,feature,created_at")
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(50000),
      ]);
      setStudents(s.data || []);
      setLogs((l.data as UsageRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const colleges = useMemo(() => Array.from(new Set(students.map((s) => s.college).filter(Boolean))).sort(), [students]);
  const degrees = useMemo(() => Array.from(new Set(students.map((s) => s.degree).filter(Boolean))).sort(), [students]);
  const departments = useMemo(() => Array.from(new Set(students.map((s) => s.department).filter(Boolean))).sort(), [students]);

  const scopedUserIds = useMemo(() => {
    let list = students;
    if (scope.type === "college" && scope.college) list = list.filter((s) => s.college === scope.college);
    if (scope.type === "cohort") {
      if (scope.college) list = list.filter((s) => s.college === scope.college);
      if (scope.degree) list = list.filter((s) => s.degree === scope.degree);
      if (scope.department) list = list.filter((s) => s.department === scope.department);
    }
    return new Set(list.map((s) => s.id));
  }, [students, scope]);

  const scopedLogs = useMemo(
    () => (scope.type === "all" ? logs : logs.filter((l) => scopedUserIds.has(l.user_id))),
    [logs, scope.type, scopedUserIds]
  );

  const featureBuckets = useMemo(() => {
    const now = Date.now();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 24 * 60 * 60 * 1000);
      return d.toISOString().slice(0, 10);
    });
    return FEATURES.map((feat) => {
      const buckets: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
      let total = 0;
      const otherUsed = new Set<string>();
      scopedLogs.forEach((l) => {
        const matched = FEATURES.find((f) => f.key !== "other" && f.match(l.feature || ""));
        const isThis = feat.key === "other" ? !matched : matched?.key === feat.key;
        if (!isThis) return;
        const day = new Date(l.created_at).toISOString().slice(0, 10);
        if (day in buckets) { buckets[day] += 1; total += 1; otherUsed.add(l.user_id); }
      });
      return { ...feat, total, uniqueUsers: otherUsed.size, series: days.map((d) => buckets[d]) };
    });
  }, [scopedLogs]);

  const scopeStudentCount = scope.type === "all" ? students.length : scopedUserIds.size;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Cohort usage — last 7 days</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {scopeStudentCount} student{scopeStudentCount === 1 ? "" : "s"} in scope
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={scope.type} onValueChange={(v) => setScope({ type: v as Scope["type"] })}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All students</SelectItem>
              <SelectItem value="college">By college</SelectItem>
              <SelectItem value="cohort">By cohort</SelectItem>
            </SelectContent>
          </Select>
          {scope.type === "college" && (
            <Select value={scope.college || ""} onValueChange={(v) => setScope({ type: "college", college: v })}>
              <SelectTrigger className="w-[200px] h-9 text-xs"><SelectValue placeholder="Pick college" /></SelectTrigger>
              <SelectContent>{colleges.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {scope.type === "cohort" && (
            <>
              <Select value={scope.college || "__any"} onValueChange={(v) => setScope({ ...scope, college: v === "__any" ? undefined : v })}>
                <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="College" /></SelectTrigger>
                <SelectContent><SelectItem value="__any">Any college</SelectItem>{colleges.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={scope.degree || "__any"} onValueChange={(v) => setScope({ ...scope, degree: v === "__any" ? undefined : v })}>
                <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Degree" /></SelectTrigger>
                <SelectContent><SelectItem value="__any">Any degree</SelectItem>{degrees.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={scope.department || "__any"} onValueChange={(v) => setScope({ ...scope, department: v === "__any" ? undefined : v })}>
                <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent><SelectItem value="__any">Any department</SelectItem>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {featureBuckets.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.key} className="rounded-lg border border-border bg-card/40 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-card-foreground">{f.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{f.uniqueUsers} users</span>
                </div>
                <p className="text-xl font-bold text-card-foreground">{f.total.toLocaleString()}</p>
                <Sparkline data={f.series} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default LLMUsageCohortPanel;
