import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Wrench, Sparkles, Code2, BookOpen, ClipboardCheck } from "lucide-react";

type Scope = { type: "all" | "college" | "cohort"; college?: string; degree?: string; department?: string };

interface UsageRow {
  user_id: string;
  feature: string;
  created_at: string;
  model?: string;
  provider?: string;
  total_tokens?: number;
  latency_ms?: number;
  status?: string;
}

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
  const [drillUid, setDrillUid] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [s, l] = await Promise.all([
        supabase.from("students").select("id,name,college,degree,department"),
        supabase.from("llm_usage_logs")
          .select("user_id,feature,created_at,model,provider,total_tokens,latency_ms,status")
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

  const leaderboard = useMemo(() => {
    const counts = new Map<string, number>();
    scopedLogs.forEach((l) => counts.set(l.user_id, (counts.get(l.user_id) || 0) + 1));
    const nameMap = new Map(students.map((s) => [s.id, s]));
    return Array.from(counts.entries())
      .map(([uid, calls]) => {
        const s = nameMap.get(uid);
        return { uid, calls, name: s?.name || "Unknown", college: s?.college || "—" };
      })
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);
  }, [scopedLogs, students]);

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

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-card-foreground">Top 10 most active students</h4>
            <span className="text-[10px] text-muted-foreground">by total LLM calls (7d)</span>
          </div>
          {leaderboard.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-6 border border-dashed border-border rounded-lg">
              No usage in this scope yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left font-medium w-10">#</th>
                    <th className="p-2 text-left font-medium">Student</th>
                    <th className="p-2 text-left font-medium">College</th>
                    <th className="p-2 text-right font-medium">Calls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaderboard.map((r, i) => (
                    <tr
                      key={r.uid}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => setDrillUid(r.uid)}
                    >
                      <td className="p-2 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="p-2 text-xs font-medium text-primary hover:underline">{r.name}</td>
                      <td className="p-2 text-xs text-muted-foreground">{r.college}</td>
                      <td className="p-2 text-xs text-right font-mono">{r.calls.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>

      <StudentDrillDownDialog
        uid={drillUid}
        student={drillUid ? students.find((s) => s.id === drillUid) : null}
        logs={drillUid ? logs.filter((l) => l.user_id === drillUid) : []}
        onClose={() => setDrillUid(null)}
      />
    </Card>
  );
};

const StudentDrillDownDialog = ({
  uid, student, logs, onClose,
}: { uid: string | null; student: any; logs: UsageRow[]; onClose: () => void }) => {
  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((l) => {
      const matched = FEATURES.find((f) => f.key !== "other" && f.match(l.feature || ""));
      const key = matched?.key || "other";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return FEATURES.map((f) => ({ ...f, count: map.get(f.key) || 0 })).filter((f) => f.count > 0);
  }, [logs]);

  const recent = useMemo(
    () => [...logs].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 25),
    [logs]
  );

  const totals = useMemo(() => ({
    calls: logs.length,
    tokens: logs.reduce((s, l) => s + (l.total_tokens || 0), 0),
    avgLatency: logs.length ? Math.round(logs.reduce((s, l) => s + (l.latency_ms || 0), 0) / logs.length) : 0,
  }), [logs]);

  return (
    <Dialog open={!!uid} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{student?.name || "Student"}</span>
            <Badge variant="secondary" className="text-[10px]">{student?.college || "—"}</Badge>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">Last 7 days · drill-down</p>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card/40 p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Calls</p>
            <p className="text-xl font-bold">{totals.calls.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-card/40 p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Tokens</p>
            <p className="text-xl font-bold">{totals.tokens.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-card/40 p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Avg Latency</p>
            <p className="text-xl font-bold">{totals.avgLatency} ms</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Feature breakdown</h4>
          {breakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">No usage in window.</p>
          ) : (
            <div className="space-y-1.5">
              {breakdown.map((b) => {
                const Icon = b.icon;
                const pct = totals.calls ? Math.round((b.count / totals.calls) * 100) : 0;
                return (
                  <div key={b.key} className="flex items-center gap-2 text-xs">
                    <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="w-24 shrink-0">{b.label}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-20 text-right font-mono text-muted-foreground">{b.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Recent calls (last 25)</h4>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-2 text-left font-medium">Time</th>
                  <th className="p-2 text-left font-medium">Feature</th>
                  <th className="p-2 text-left font-medium">Model</th>
                  <th className="p-2 text-right font-medium">Tokens</th>
                  <th className="p-2 text-right font-medium">Latency</th>
                  <th className="p-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((r, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="p-2 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-2 font-mono">{r.feature || "—"}</td>
                    <td className="p-2 font-mono text-muted-foreground">{r.model || "—"}</td>
                    <td className="p-2 text-right">{(r.total_tokens || 0).toLocaleString()}</td>
                    <td className="p-2 text-right">{r.latency_ms || 0} ms</td>
                    <td className="p-2">
                      <Badge variant={r.status === "success" ? "secondary" : "destructive"} className="text-[10px]">
                        {r.status || "—"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No calls.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LLMUsageCohortPanel;
