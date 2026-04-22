// Read-only operations dashboard for the Coordinator (moderator) role.
// Admins can also view this — it's a quick at-a-glance status panel.
//
// Surfaces:
//   • Live MCQ regeneration jobs + per-lesson progress
//   • Recently failed MCQ jobs (with their last error)
//   • Pending trainer approvals (read-only summary)
//   • Latest approval/rejection activity
//
// Every admin-only control on this screen is rendered as a disabled button
// with a tooltip explaining the role gate, so coordinators see what exists
// and exactly why they can't touch it.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, Clock, ShieldCheck, Eye, RefreshCw, Check, X, Lock, Activity, Search, Filter } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

type LessonStatusFilter = "all" | "running" | "failed" | "awaiting_retry";

interface VideoLessonRow {
  id: string;
  title: string;
  status: string;
  generation_status: string;
  generation_error: string;
  chapters: { title: string; startSeconds: number }[];
  version: number;
  last_regenerated_at: string | null;
  // Explicit server-stored timestamp for the next scheduled auto-retry.
  // Replaces the previous heuristic of "failed within the last 60s".
  retry_scheduled_at: string | null;
}
interface PendingTrainer { id: string; name: string; email: string; college: string; created_at: string }
interface ActivityRow { id: string; trainer_name: string; action: string; reason: string; actor_name: string; created_at: string }

const ADMIN_ONLY_TIP = "Requires the Admin role. Coordinators have read-only access — ask an admin to take this action.";

const CoordinatorDashboard = () => {
  const { isAdmin, isCoordinator, loading: roleLoading } = useUserRole();
  const [lessons, setLessons] = useState<VideoLessonRow[]>([]);
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<PendingTrainer[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [lessonStatus, setLessonStatus] = useState<LessonStatusFilter>("all");
  const [dateFrom, setDateFrom] = useState<string>(""); // yyyy-mm-dd
  const [dateTo, setDateTo] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [l, t, a] = await Promise.all([
      supabase.from("video_lessons").select("id,title,status,generation_status,generation_error,chapters,version,last_regenerated_at,retry_scheduled_at").order("last_regenerated_at", { ascending: false, nullsFirst: false }).limit(50),
      supabase.from("trainers").select("id,name,email,college,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(25),
      supabase.from("trainer_activity_log").select("id,trainer_name,action,reason,actor_name,created_at").order("created_at", { ascending: false }).limit(15),
    ]);
    setLessons((l.data ?? []) as any);
    setPending((t.data ?? []) as any);
    setActivity((a.data ?? []) as any);
    setLoading(false);
    setRefreshedAt(new Date());
  };

  // Refresh question counts so progress bars on running jobs update live.
  const refreshLiveCounts = async () => {
    const running = lessons.filter((x) => x.generation_status === "running");
    if (!running.length) return;
    const next: Record<string, number> = {};
    await Promise.all(
      running.map(async (l) => {
        const { count } = await supabase.from("video_lesson_questions").select("id", { count: "exact", head: true }).eq("lesson_id", l.id);
        next[l.id] = count || 0;
      })
    );
    setLiveCounts((p) => ({ ...p, ...next }));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    // Poll every 4s while any job is running, else every 30s as a soft refresh.
    const anyRunning = lessons.some((l) => l.generation_status === "running");
    const interval = anyRunning ? 4000 : 30000;
    const t = window.setInterval(() => { load(); refreshLiveCounts(); }, interval);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons.map((l) => l.id + l.generation_status).join(",")]);

  const fromTs = useMemo(() => (dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null), [dateFrom]);
  const toTs = useMemo(() => (dateTo ? new Date(dateTo + "T23:59:59.999").getTime() : null), [dateTo]);
  const inRange = (iso: string | null | undefined) => {
    if (!iso) return true;
    const t = new Date(iso).getTime();
    if (fromTs !== null && t < fromTs) return false;
    if (toTs !== null && t > toTs) return false;
    return true;
  };
  const matchesText = (s: string) => !search.trim() || s.toLowerCase().includes(search.trim().toLowerCase());
  // Source of truth: server-stored `retry_scheduled_at`. A lesson is "awaiting retry"
  // iff that timestamp is in the future (no more 60s last_regenerated_at heuristic).
  const isAwaitingRetry = (l: VideoLessonRow) =>
    l.generation_status === "failed" && !!l.retry_scheduled_at && new Date(l.retry_scheduled_at).getTime() > Date.now();

  const filteredLessons = useMemo(() => lessons.filter((l) => {
    if (!matchesText(l.title)) return false;
    if (!inRange(l.last_regenerated_at)) return false;
    if (lessonStatus === "running" && l.generation_status !== "running") return false;
    if (lessonStatus === "failed" && l.generation_status !== "failed") return false;
    if (lessonStatus === "awaiting_retry" && !isAwaitingRetry(l)) return false;
    return true;
  }), [lessons, search, lessonStatus, fromTs, toTs]);

  const running = useMemo(() => filteredLessons.filter((l) => l.generation_status === "running"), [filteredLessons]);
  const failed = useMemo(() => filteredLessons.filter((l) => l.generation_status === "failed").slice(0, 8), [filteredLessons]);
  const awaitingRetry = useMemo(() => filteredLessons.filter(isAwaitingRetry), [filteredLessons]);

  const filteredPending = useMemo(() => pending.filter((p) => (matchesText(p.name) || matchesText(p.email) || matchesText(p.college)) && inRange(p.created_at)), [pending, search, fromTs, toTs]);
  const filteredActivity = useMemo(() => activity.filter((a) => (matchesText(a.trainer_name) || matchesText(a.actor_name) || matchesText(a.action)) && inRange(a.created_at)), [activity, search, fromTs, toTs]);

  const hasFilters = !!search || lessonStatus !== "all" || !!dateFrom || !!dateTo;
  const clearFilters = () => { setSearch(""); setLessonStatus("all"); setDateFrom(""); setDateTo(""); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Coordinator Operations
          </h2>
          <p className="text-sm text-muted-foreground">Live status across MCQ regeneration jobs and trainer approval queue.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {!roleLoading && isCoordinator && !isAdmin && (
        <div className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-sm flex items-start gap-2">
          <Lock className="h-4 w-4 text-warning mt-0.5" />
          <div>
            <p><strong>Coordinator view</strong> — this dashboard is read-only.</p>
            <p className="text-xs text-muted-foreground">All buttons that mutate data (approve, regenerate, publish, rollback) are disabled and clearly marked. Hover any disabled button to see which role is required.</p>
          </div>
        </div>
      )}
      {!roleLoading && isAdmin && (
        <div className="rounded-md border border-success/40 bg-success/5 px-3 py-2 text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-success" />
          <span><strong>Admin view</strong> — you have full access. Use the dedicated Management and Video → MCQ pages to take action.</span>
        </div>
      )}

      {/* Filter bar */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] text-muted-foreground font-medium">Search trainer / lesson</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, college, lesson title…" className="h-9 pl-8 text-sm" />
            </div>
          </div>
          <div className="min-w-[170px]">
            <label className="text-[11px] text-muted-foreground font-medium">Lesson status</label>
            <Select value={lessonStatus} onValueChange={(v) => setLessonStatus(v as LessonStatusFilter)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="awaiting_retry">Awaiting retry</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-medium">From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-medium">To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5"><X className="h-3.5 w-3.5" /> Clear</Button>
          )}
          <Badge variant="outline" className="ml-auto gap-1.5 text-xs"><Filter className="h-3 w-3" /> {filteredLessons.length} lessons · {filteredPending.length} pending</Badge>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className={`h-8 w-8 text-primary ${running.length ? "animate-spin" : "opacity-30"}`} />
            <div>
              <div className="text-2xl font-bold">{running.length}</div>
              <div className="text-xs text-muted-foreground">Active regeneration jobs</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className={`h-8 w-8 ${failed.length ? "text-destructive" : "text-muted-foreground/40"}`} />
            <div>
              <div className="text-2xl font-bold">{failed.length}</div>
              <div className="text-xs text-muted-foreground">Recently failed lessons</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <RefreshCw className={`h-8 w-8 ${awaitingRetry.length ? "text-warning" : "text-muted-foreground/40"}`} />
            <div>
              <div className="text-2xl font-bold">{awaitingRetry.length}</div>
              <div className="text-xs text-muted-foreground">Awaiting auto-retry</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className={`h-8 w-8 ${filteredPending.length ? "text-warning" : "text-muted-foreground/40"}`} />
            <div>
              <div className="text-2xl font-bold">{filteredPending.length}</div>
              <div className="text-xs text-muted-foreground">Trainers awaiting approval</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live regeneration */}
      <Card className={running.length ? "border-primary/40 bg-primary/5" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {running.length ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Activity className="h-4 w-4 text-muted-foreground" />}
            Live regeneration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {running.length === 0 ? (
            <p className="text-sm text-muted-foreground">{hasFilters ? "No running jobs match the current filters." : "No regeneration jobs are currently running."}</p>
          ) : (
            <div className="space-y-3">
              {running.map((l) => {
                const total = l.chapters?.length || 0;
                const live = liveCounts[l.id] ?? 0;
                const processed = Math.min(total, Math.ceil(live / 3));
                const pct = total ? Math.round((processed / total) * 100) : 0;
                return (
                  <div key={l.id} className="rounded-md border border-border bg-background p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{l.title}</p>
                        <p className="text-xs text-muted-foreground">v{l.version || 1} · chapter {Math.min(processed + 1, total)} of {total}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{live} questions saved</Badge>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" disabled title={ADMIN_ONLY_TIP} className="h-7 text-xs gap-1.5">
                        <Lock className="h-3 w-3" /> Cancel job (Admin only)
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Failures */}
      {failed.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> Recently failed lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Lesson</TableHead><TableHead>Last error</TableHead><TableHead>v</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {failed.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <span>{l.title}</span>
                        {isAwaitingRetry(l) && <Badge variant="outline" className="text-[10px] gap-1 border-warning/50 text-warning"><RefreshCw className="h-2.5 w-2.5" /> awaiting retry</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-md truncate" title={l.generation_error}>{l.generation_error || "—"}</TableCell>
                    <TableCell className="text-xs">{l.version}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" disabled={!isAdmin} title={!isAdmin ? ADMIN_ONLY_TIP : "Open Video → MCQ to retry this lesson."} className="h-7 text-xs gap-1.5">
                        {!isAdmin && <Lock className="h-3 w-3" />} Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pending trainers (read-only) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-warning" /> Pending trainer approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filteredPending.length === 0 ? (
            <p className="text-sm text-muted-foreground">All caught up — no trainers awaiting approval.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>College</TableHead><TableHead>Registered</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {filteredPending.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-xs">{t.email}</TableCell>
                    <TableCell className="text-xs">{t.college}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" disabled={!isAdmin} title={!isAdmin ? ADMIN_ONLY_TIP : "Open Management → Pending Trainers to take action."} className="h-7 text-xs gap-1.5">
                        {!isAdmin && <Lock className="h-3 w-3" />}<Check className="h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" disabled={!isAdmin} title={!isAdmin ? ADMIN_ONLY_TIP : "Open Management → Pending Trainers to take action."} className="h-7 text-xs gap-1.5 text-destructive border-destructive/30">
                        {!isAdmin && <Lock className="h-3 w-3" />}<X className="h-3 w-3" /> Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> Recent approval activity</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approval/rejection actions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>When</TableHead><TableHead>Trainer</TableHead><TableHead>Action</TableHead><TableHead>By</TableHead><TableHead>Reason / note</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivity.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-medium text-sm">{row.trainer_name}</TableCell>
                    <TableCell><Badge variant={row.action === "rejected" ? "destructive" : "default"} className="capitalize">{row.action}</Badge></TableCell>
                    <TableCell className="text-xs">{row.actor_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-sm">{row.reason || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {refreshedAt && (
        <p className="text-[11px] text-muted-foreground text-right">Last refreshed {refreshedAt.toLocaleTimeString()} · auto-refreshes every {running.length ? "4s" : "30s"}</p>
      )}
    </div>
  );
};

export default CoordinatorDashboard;
