import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Activity, GitCompare, Paperclip, MessageSquare, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

interface HistoryRow {
  id: string;
  submission_id: string;
  curriculum_id: string;
  student_id: string;
  student_name?: string | null;
  version_number: number | null;
  kind: string;
  attachment_name: string;
  trainer_feedback: string;
  notes: string;
  status: string;
  actor_role: string;
  actor_name: string;
  created_at: string;
}

interface Props {
  studentIds: string[];
  studentNameById: Record<string, string>;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--accent))"];

const countAtts = (s: string) => (s ? s.split(/[\n,|]+/).map((t) => t.trim()).filter(Boolean).length : 0);

const TrainerDiffAnalytics = ({ studentIds, studentNameById }: Props) => {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [subs, setSubs] = useState<Record<string, { curriculum_id: string; student_id: string; student_name: string }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [days, setDays] = useState<7 | 14 | 30>(14);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      if (studentIds.length === 0) { setRows([]); setLoading(false); return; }
      const { data: hist } = await supabase
        .from("curriculum_submission_history")
        .select("*")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (!active) return;
      const subIds = Array.from(new Set((hist || []).map((r: any) => r.submission_id).filter(Boolean)));
      let subMap: typeof subs = {};
      if (subIds.length) {
        const { data: subRows } = await supabase
          .from("curriculum_submissions")
          .select("id, curriculum_id, student_id, student_name")
          .in("id", subIds);
        (subRows || []).forEach((s: any) => { subMap[s.id] = s; });
      }
      setSubs(subMap);
      setRows((hist as any[]) || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [studentIds.join(",")]);

  const enriched = useMemo(() => rows.map((r) => ({
    ...r,
    student_name: r.student_name || studentNameById[r.student_id] || subs[r.submission_id]?.student_name || "Student",
    attCount: countAtts(r.attachment_name),
    fbLen: (r.trainer_feedback || "").length,
    notesLen: (r.notes || "").length,
  })), [rows, subs, studentNameById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((r) =>
      r.student_name.toLowerCase().includes(q) ||
      (r.attachment_name || "").toLowerCase().includes(q) ||
      (r.actor_name || "").toLowerCase().includes(q) ||
      (r.curriculum_id || "").toLowerCase().includes(q),
    );
  }, [enriched, search]);

  const counters = useMemo(() => {
    const total = filtered.length;
    const studentSubs = filtered.filter((r) => r.kind === "student_submission").length;
    const trainerEvents = total - studentSubs;
    const uniqStudents = new Set(filtered.map((r) => r.student_id)).size;
    const uniqCurricula = new Set(filtered.map((r) => r.curriculum_id)).size;
    const totalAtts = filtered.reduce((a, r) => a + r.attCount, 0);
    return { total, studentSubs, trainerEvents, uniqStudents, uniqCurricula, totalAtts };
  }, [filtered]);

  const topStudents = useMemo(() => {
    const m = new Map<string, { name: string; revisions: number; submissions: number }>();
    filtered.forEach((r) => {
      const cur = m.get(r.student_id) || { name: r.student_name, revisions: 0, submissions: 0 };
      if (r.kind === "student_submission") cur.submissions += 1; else cur.revisions += 1;
      m.set(r.student_id, cur);
    });
    return Array.from(m.values())
      .sort((a, b) => (b.revisions + b.submissions) - (a.revisions + a.submissions))
      .slice(0, 8);
  }, [filtered]);

  const timeline = useMemo(() => {
    const buckets = new Map<string, { day: string; submissions: number; revisions: number; attachments: number }>();
    const cutoff = Date.now() - days * 86400000;
    filtered.forEach((r) => {
      const t = new Date(r.created_at).getTime();
      if (t < cutoff) return;
      const day = r.created_at.slice(0, 10);
      const cur = buckets.get(day) || { day, submissions: 0, revisions: 0, attachments: 0 };
      if (r.kind === "student_submission") cur.submissions += 1; else cur.revisions += 1;
      cur.attachments += r.attCount;
      buckets.set(day, cur);
    });
    return Array.from(buckets.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [filtered, days]);

  const statusBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((r) => {
      const k = (r.status || "unknown").toLowerCase();
      m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const topChurn = useMemo(() => {
    const m = new Map<string, { curriculum_id: string; events: number; atts: number; fbLen: number; students: Set<string> }>();
    filtered.forEach((r) => {
      const cur = m.get(r.curriculum_id) || { curriculum_id: r.curriculum_id, events: 0, atts: 0, fbLen: 0, students: new Set() };
      cur.events += 1;
      cur.atts += r.attCount;
      cur.fbLen += r.fbLen;
      cur.students.add(r.student_id);
      m.set(r.curriculum_id, cur);
    });
    return Array.from(m.values())
      .map((c) => ({ ...c, studentCount: c.students.size }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 6);
  }, [filtered]);

  const recent = filtered.slice(0, 12);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (rows.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <GitCompare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-display font-semibold text-card-foreground">No submission diffs yet</h3>
        <p className="text-sm text-muted-foreground mt-1">Once your students submit and revise curriculum work, churn analytics appear here.</p>
      </div>
    );
  }

  const stats = [
    { label: "History Events", value: counters.total, icon: Activity, color: "text-primary" },
    { label: "Student Submissions", value: counters.studentSubs, icon: GitCompare, color: "text-success" },
    { label: "Trainer / Revision Events", value: counters.trainerEvents, icon: MessageSquare, color: "text-warning" },
    { label: "Active Students", value: counters.uniqStudents, icon: Users, color: "text-accent" },
    { label: "Curricula Touched", value: counters.uniqCurricula, icon: GitCompare, color: "text-primary" },
    { label: "Attachments Tracked", value: counters.totalAtts, icon: Paperclip, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search student, attachment, curriculum…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1">
          {([7, 14, 30] as const).map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
              {d}d
            </Button>
          ))}
        </div>
        <Badge variant="outline" className="ml-auto">{filtered.length} of {rows.length} events</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card border border-border rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-xl font-display font-bold text-card-foreground">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5 shadow-card">
          <h4 className="font-display font-semibold mb-4 text-card-foreground">Activity Timeline (last {days} days)</h4>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="submissions" stroke="hsl(var(--primary))" name="Submissions" />
              <Line type="monotone" dataKey="revisions" stroke="hsl(var(--warning))" name="Revisions" />
              <Line type="monotone" dataKey="attachments" stroke="hsl(var(--success))" name="Attachments" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-card">
          <h4 className="font-display font-semibold mb-4 text-card-foreground">Top Students by Diff Activity</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topStudents} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={120} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend />
              <Bar dataKey="submissions" stackId="a" fill="hsl(var(--primary))" name="Submissions" />
              <Bar dataKey="revisions" stackId="a" fill="hsl(var(--warning))" name="Revisions" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-card">
          <h4 className="font-display font-semibold mb-4 text-card-foreground">Status Breakdown</h4>
          {statusBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No status data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}>
                  {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-card">
          <h4 className="font-display font-semibold mb-4 text-card-foreground">Top Curricula by Churn</h4>
          {topChurn.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No churn yet.</p>
          ) : (
            <div className="space-y-2">
              {topChurn.map((c) => (
                <div key={c.curriculum_id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/40">
                  <code className="text-[10px] text-muted-foreground truncate max-w-[8rem]" title={c.curriculum_id}>{c.curriculum_id.slice(0, 8)}…</code>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                    <span><span className="text-muted-foreground">events</span> <b className="text-card-foreground">{c.events}</b></span>
                    <span><span className="text-muted-foreground">atts</span> <b className="text-card-foreground">{c.atts}</b></span>
                    <span><span className="text-muted-foreground">students</span> <b className="text-card-foreground">{c.studentCount}</b></span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => { navigator.clipboard.writeText(c.curriculum_id); }}>Copy ID</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 shadow-card">
        <h4 className="font-display font-semibold mb-4 text-card-foreground">Recent Diff Events</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left p-2">When</th>
                <th className="text-left p-2">Student</th>
                <th className="text-left p-2">Kind</th>
                <th className="text-left p-2">Version</th>
                <th className="text-left p-2">Atts</th>
                <th className="text-left p-2">Feedback len</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2 text-card-foreground">{r.student_name}</td>
                  <td className="p-2">
                    <Badge variant="outline" className={r.kind === "student_submission" ? "text-primary border-primary/40" : "text-warning border-warning/40"}>
                      {r.kind === "student_submission" ? "submission" : (r.kind || "event")}
                    </Badge>
                  </td>
                  <td className="p-2 text-xs">{r.version_number ?? "—"}</td>
                  <td className="p-2 text-xs">{r.attCount}</td>
                  <td className="p-2 text-xs">{r.fbLen}</td>
                  <td className="p-2 text-xs">{r.status || "—"}</td>
                  <td className="p-2 text-xs text-muted-foreground">{r.actor_name || r.actor_role || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrainerDiffAnalytics;
