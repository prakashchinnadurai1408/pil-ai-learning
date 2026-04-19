import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, Brain, Route, ArrowRight, RefreshCw, MessageSquare, FlaskConical,
  Code2, Pencil, BookOpen, ClipboardCheck, FolderKanban, Trophy, Activity,
  Layers, CheckCircle2, PlayCircle, Clock, Crown,
} from "lucide-react";
import { modules } from "@/data/modules";
import DiagnosticAssessmentDialog from "./DiagnosticAssessmentDialog";
import { TIER_META, type Tier } from "@/hooks/useMenuAccessControls";

interface Props {
  studentId: string | null;
  studentName: string;
  studentCollege: string;
  studentDepartment: string;
  studentDegree: string;
  userTier: Tier;
  onNavigate: (tab: string, moduleId?: number) => void;
}

interface PathSummary {
  id: string;
  title: string;
  is_beginner_default: boolean;
  modules: { module_id: number; module_title: string }[];
}

interface DiagSummary {
  score: number;
  total_questions: number;
  correct_answers: number;
  taken_at: string;
  topic_breakdown: Record<string, { correct: number; total: number }>;
}

interface GroupSummary {
  id: string;
  name: string;
  total: number;
  completed: number;
  pct: number;
}

interface UsageCounts {
  aiChat: number;
  aiTools: number;
  prompts: number;
  coding: number;
  modulesAccessed: number;
  modulesCompleted: number;
  quizzes: number;
}

type Spark = number[]; // 7 numbers, oldest → newest
interface UsageSparks {
  aiChat: Spark;
  aiTools: Spark;
  prompts: Spark;
  coding: Spark;
  modules: Spark;
  quizzes: Spark;
}

interface AssessmentStat {
  attempts: number;
  avgScore: number;
  passRate: number;
  recent: { score: number; completed_at: string | null; title?: string }[];
}

interface ProjectStat {
  assigned: number;
  inProgress: number;
  completed: number;
  avgStepPct: number;
}

type ActivityKind = "module" | "quiz" | "assessment" | "project" | "chat" | "coding";
interface ActivityItem {
  kind: ActivityKind;
  label: string;
  detail: string;
  ts: number;
  resumeTab: string;
  moduleId?: number;
}

const StudentOverview = ({
  studentId, studentName, userTier, onNavigate,
}: Props) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [path, setPath] = useState<PathSummary | null>(null);
  const [diag, setDiag] = useState<DiagSummary | null>(null);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [usage, setUsage] = useState<UsageCounts>({
    aiChat: 0, aiTools: 0, prompts: 0, coding: 0,
    modulesAccessed: 0, modulesCompleted: 0, quizzes: 0,
  });
  const [sparks, setSparks] = useState<UsageSparks>({
    aiChat: [0,0,0,0,0,0,0], aiTools: [0,0,0,0,0,0,0], prompts: [0,0,0,0,0,0,0],
    coding: [0,0,0,0,0,0,0], modules: [0,0,0,0,0,0,0], quizzes: [0,0,0,0,0,0,0],
  });
  const [assessStat, setAssessStat] = useState<AssessmentStat>({ attempts: 0, avgScore: 0, passRate: 0, recent: [] });
  const [projectStat, setProjectStat] = useState<ProjectStat>({ assigned: 0, inProgress: 0, completed: 0, avgStepPct: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [diagOpen, setDiagOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }
    setRefreshing(true);

    const [
      pathRes, pathModsRes, diagRes, groupAssignsRes, modProgRes,
      chatLogsRes, codingRes, assessAttemptsRes, assessScoresRes,
      projAssignsRes, projProgressRes,
    ] = await Promise.all([
      supabase.from("candidate_learning_paths").select("id, title, is_beginner_default")
        .eq("candidate_id", studentId).eq("status", "active").order("generated_at", { ascending: false }).limit(1),
      supabase.from("candidate_learning_path_modules").select("path_id, module_id, module_title, sort_order").order("sort_order"),
      supabase.from("candidate_diagnostic_results").select("score, total_questions, correct_answers, taken_at, topic_breakdown")
        .eq("candidate_id", studentId).order("taken_at", { ascending: false }).limit(1),
      supabase.from("module_group_assignments").select("group_id, scope_type, student_id, college, department, degree").eq("student_id", studentId),
      supabase.from("student_module_progress").select("module_id, progress_percent, completed, last_accessed").eq("student_id", studentId),
      supabase.from("llm_usage_logs").select("feature, created_at").eq("user_id", studentId).order("created_at", { ascending: false }).limit(500),
      supabase.from("student_solved_challenges").select("language, solved_at").eq("student_name", studentName).order("solved_at", { ascending: false }).limit(50),
      supabase.from("assessment_attempts").select("score, completed_at, assessment_id").eq("student_id", studentId).order("completed_at", { ascending: false }).limit(50),
      supabase.from("student_assessment_scores").select("score, attempted_at, module_id").eq("student_id", studentId).order("attempted_at", { ascending: false }).limit(50),
      supabase.from("project_assignments").select("id, title, status, updated_at, stream_id").eq("student_id", studentId),
      supabase.from("student_project_progress").select("stream_id, completed_steps, updated_at").eq("student_name", studentName),
    ]);

    // Path
    const latestPath = pathRes.data?.[0];
    if (latestPath) {
      const modsForPath = (pathModsRes.data || []).filter((m: any) => m.path_id === latestPath.id);
      setPath({
        id: latestPath.id,
        title: latestPath.title,
        is_beginner_default: latestPath.is_beginner_default,
        modules: modsForPath.map((m: any) => ({ module_id: m.module_id, module_title: m.module_title })),
      });
    } else {
      setPath(null);
    }

    // Diagnostic
    setDiag((diagRes.data?.[0] as any) || null);

    // Module Groups
    const groupIds = [...new Set((groupAssignsRes.data || []).map((a: any) => a.group_id))];
    if (groupIds.length > 0) {
      const [gMetaRes, gItemsRes] = await Promise.all([
        supabase.from("module_groups").select("id, name").in("id", groupIds),
        supabase.from("module_group_items").select("group_id, module_id").in("group_id", groupIds),
      ]);
      const progMap: Record<number, boolean> = {};
      (modProgRes.data || []).forEach((r: any) => { if (r.completed) progMap[r.module_id] = true; });
      const gs: GroupSummary[] = (gMetaRes.data || []).map((g: any) => {
        const items = (gItemsRes.data || []).filter((i: any) => i.group_id === g.id);
        const total = items.length;
        const completed = items.filter((i: any) => progMap[i.module_id]).length;
        return { id: g.id, name: g.name, total, completed, pct: total ? Math.round((completed / total) * 100) : 0 };
      });
      setGroups(gs);
    } else {
      setGroups([]);
    }

    // Usage counters
    const chatLogs = chatLogsRes.data || [];
    const aiChat = chatLogs.filter((l: any) => l.feature === "chat").length;
    const aiTools = chatLogs.filter((l: any) => String(l.feature || "").startsWith("tool")).length;
    const prompts = chatLogs.filter((l: any) => l.feature === "prompt_lab").length;
    const modProg = modProgRes.data || [];
    setUsage({
      aiChat,
      aiTools,
      prompts,
      coding: codingRes.data?.length || 0,
      modulesAccessed: modProg.length,
      modulesCompleted: modProg.filter((m: any) => m.completed).length,
      quizzes: assessScoresRes.data?.length || 0,
    });

    // 7-day sparklines (oldest → newest). Bucket each event into the day index.
    const dayMs = 86400000;
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startTs = startOfToday.getTime() - 6 * dayMs; // 7 buckets total
    const empty = (): Spark => [0, 0, 0, 0, 0, 0, 0];
    const bucket = (arr: Spark, isoOrTs: string | number | null | undefined) => {
      if (!isoOrTs) return;
      const ts = typeof isoOrTs === "number" ? isoOrTs : new Date(isoOrTs).getTime();
      const idx = Math.floor((ts - startTs) / dayMs);
      if (idx >= 0 && idx < 7) arr[idx]++;
    };
    const sChat = empty(), sTools = empty(), sPrompts = empty();
    chatLogs.forEach((l: any) => {
      if (l.feature === "chat") bucket(sChat, l.created_at);
      else if (l.feature === "prompt_lab") bucket(sPrompts, l.created_at);
      else if (String(l.feature || "").startsWith("tool")) bucket(sTools, l.created_at);
    });
    const sCoding = empty();
    (codingRes.data || []).forEach((c: any) => bucket(sCoding, c.solved_at));
    const sModules = empty();
    modProg.forEach((m: any) => bucket(sModules, m.last_accessed));
    const sQuizzes = empty();
    (assessScoresRes.data || []).forEach((q: any) => bucket(sQuizzes, q.attempted_at));
    setSparks({ aiChat: sChat, aiTools: sTools, prompts: sPrompts, coding: sCoding, modules: sModules, quizzes: sQuizzes });

    // Assessments
    const attempts = (assessAttemptsRes.data || []).filter((a: any) => a.completed_at);
    const avgScore = attempts.length ? Math.round(attempts.reduce((s: number, a: any) => s + (a.score || 0), 0) / attempts.length) : 0;
    const passRate = attempts.length ? Math.round((attempts.filter((a: any) => (a.score || 0) >= 60).length / attempts.length) * 100) : 0;
    setAssessStat({
      attempts: attempts.length,
      avgScore,
      passRate,
      recent: attempts.slice(0, 5).map((a: any) => ({ score: a.score, completed_at: a.completed_at })),
    });

    // Projects
    const projAssigns = projAssignsRes.data || [];
    const projProgs = projProgressRes.data || [];
    const stepPcts = projProgs.map((p: any) => {
      const steps = p.completed_steps || {};
      const total = Object.keys(steps).length;
      const done = Object.values(steps).filter(Boolean).length;
      return total ? (done / total) * 100 : 0;
    });
    setProjectStat({
      assigned: projAssigns.length,
      inProgress: projAssigns.filter((p: any) => p.status === "in_progress" || p.status === "assigned").length,
      completed: projAssigns.filter((p: any) => p.status === "completed").length,
      avgStepPct: stepPcts.length ? Math.round(stepPcts.reduce((s, x) => s + x, 0) / stepPcts.length) : 0,
    });

    // Activity timeline (merge & sort)
    const events: ActivityItem[] = [];
    modProg.slice(0, 20).forEach((m: any) => {
      if (m.last_accessed) {
        const mod = modules.find(x => x.id === m.module_id);
        events.push({
          kind: "module",
          label: mod?.title || `Module #${m.module_id}`,
          detail: m.completed ? "Completed" : `${m.progress_percent || 0}% in progress`,
          ts: new Date(m.last_accessed).getTime(),
          resumeTab: "modules",
          moduleId: m.module_id,
        });
      }
    });
    (assessScoresRes.data || []).slice(0, 20).forEach((s: any) => {
      const mod = modules.find(x => x.id === s.module_id);
      events.push({
        kind: "quiz",
        label: `Quiz · ${mod?.title || `Module #${s.module_id}`}`,
        detail: `Scored ${s.score}%`,
        ts: new Date(s.attempted_at).getTime(),
        resumeTab: "modules",
        moduleId: s.module_id,
      });
    });
    attempts.slice(0, 10).forEach((a: any) => {
      events.push({
        kind: "assessment",
        label: "Assessment attempt",
        detail: `Scored ${a.score}%`,
        ts: new Date(a.completed_at).getTime(),
        resumeTab: "assessments",
      });
    });
    projProgs.slice(0, 5).forEach((p: any) => {
      events.push({
        kind: "project",
        label: `Project · ${p.stream_id}`,
        detail: "Updated progress",
        ts: new Date(p.updated_at).getTime(),
        resumeTab: "projects",
      });
    });
    chatLogs.slice(0, 10).forEach((l: any) => {
      events.push({
        kind: l.feature === "chat" ? "chat" : "chat",
        label: `AI ${l.feature || "chat"}`,
        detail: "Used AI",
        ts: new Date(l.created_at).getTime(),
        resumeTab: l.feature === "prompt_lab" ? "prompts" : (String(l.feature || "").startsWith("tool") ? "tools" : "playground"),
      });
    });
    (codingRes.data || []).slice(0, 10).forEach((c: any) => {
      events.push({
        kind: "coding",
        label: `Coding · ${c.language}`,
        detail: "Solved a challenge",
        ts: new Date(c.solved_at).getTime(),
        resumeTab: "coding",
      });
    });

    events.sort((a, b) => b.ts - a.ts);
    setActivity(events.slice(0, 20));

    setLoading(false);
    setRefreshing(false);
  }, [studentId, studentName]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fmtAgo = (ts: number) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const ActivityIcon = ({ kind }: { kind: ActivityKind }) => {
    const map: Record<ActivityKind, typeof BookOpen> = {
      module: BookOpen, quiz: Trophy, assessment: ClipboardCheck,
      project: FolderKanban, chat: MessageSquare, coding: Code2,
    };
    const I = map[kind];
    return <I className="h-3.5 w-3.5 text-primary" />;
  };

  if (loading) {
    return <div className="space-y-4">
      <div className="h-24 bg-muted/30 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted/30 rounded-lg animate-pulse" />)}
      </div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card>
        <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-display font-bold text-card-foreground mb-1">Welcome back, {studentName} 👋</h2>
            <p className="text-sm text-muted-foreground">
              Tier: <Badge variant="outline" className={`ml-1 ${TIER_META[userTier].color} border-current`}>
                <Crown className="h-3 w-3 mr-1" />{TIER_META[userTier].label}
              </Badge>
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={fetchAll} disabled={refreshing} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardContent>
      </Card>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={CheckCircle2} label="Modules done" value={`${usage.modulesCompleted}/${usage.modulesAccessed || modules.length}`} />
        <KPI icon={Trophy} label="Avg Quiz" value={usage.quizzes ? `${assessStat.avgScore || "—"}%` : "—"} />
        <KPI icon={ClipboardCheck} label="Avg Assessment" value={assessStat.attempts ? `${assessStat.avgScore}%` : "—"} />
        <KPI icon={Code2} label="Coding solved" value={String(usage.coding)} />
      </div>

      {/* Study plan + Diagnostic */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="h-4 w-4 text-primary" /> My AI Study Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!path ? (
              <div className="text-center py-4">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground mb-3">No personalized path yet — let Prakash build one for you.</p>
                <Button size="sm" onClick={() => onNavigate("ai_path")} className="gap-1.5">
                  <Sparkles className="h-4 w-4" /> Generate My Path
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-card-foreground">{path.title}</p>
                <div className="space-y-1.5">
                  {path.modules.slice(0, 3).map((m, i) => (
                    <button key={m.module_id} onClick={() => onNavigate("modules", m.module_id)}
                      className="w-full text-left flex items-center gap-2 p-2 rounded border border-border hover:bg-muted/30 transition-colors group">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">{i + 1}</div>
                      <span className="text-xs text-card-foreground flex-1 truncate">{m.module_title}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                    </button>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full mt-2 gap-1.5" onClick={() => onNavigate("ai_path")}>
                  View Full Plan <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent-foreground" /> Diagnostic Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!diag ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">No diagnostic yet. Take a 10-question quiz so we can tailor your path.</p>
                <Button size="sm" onClick={() => setDiagOpen(true)} className="gap-1.5">
                  <Brain className="h-4 w-4" /> Take Diagnostic
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-display font-bold text-primary">{diag.score}%</p>
                    <p className="text-xs text-muted-foreground">{diag.correct_answers}/{diag.total_questions} correct · {fmtAgo(new Date(diag.taken_at).getTime())}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setDiagOpen(true)} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> Retake
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(diag.topic_breakdown || {}).slice(0, 4).map(([topic, b]) => {
                    const pct = b.total ? Math.round((b.correct / b.total) * 100) : 0;
                    return (
                      <div key={topic}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-muted-foreground truncate">{topic}</span>
                          <span className="font-medium">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Groups Coverage */}
      {groups.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Module Group Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            {groups.map((g) => (
              <button key={g.id} onClick={() => onNavigate("module_groups")}
                className="text-left p-3 rounded border border-border hover:bg-muted/30 transition-colors">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-card-foreground truncate">{g.name}</span>
                  <Badge variant="outline" className="text-[10px]">{g.completed}/{g.total}</Badge>
                </div>
                <Progress value={g.pct} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">{g.pct}% complete</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Usage tiles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Feature Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <UsageTile icon={MessageSquare} label="AI Chat" value={usage.aiChat} onClick={() => onNavigate("playground")} />
          <UsageTile icon={FlaskConical} label="AI Tools" value={usage.aiTools} onClick={() => onNavigate("tools")} />
          <UsageTile icon={Pencil} label="Prompts" value={usage.prompts} onClick={() => onNavigate("prompts")} />
          <UsageTile icon={Code2} label="Coding" value={usage.coding} onClick={() => onNavigate("coding")} />
          <UsageTile icon={BookOpen} label="Modules" value={usage.modulesAccessed} onClick={() => onNavigate("modules")} />
          <UsageTile icon={Trophy} label="Quizzes" value={usage.quizzes} onClick={() => onNavigate("modules")} />
        </CardContent>
      </Card>

      {/* Assessments + Projects */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" /> Assessment Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Attempts" value={assessStat.attempts} />
              <Stat label="Avg Score" value={`${assessStat.avgScore}%`} />
              <Stat label="Pass Rate" value={`${assessStat.passRate}%`} />
            </div>
            {assessStat.recent.length > 0 && (
              <div className="flex items-end justify-between gap-1 h-16 pt-2 border-t border-border">
                {assessStat.recent.slice().reverse().map((a, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-primary/20 rounded-t" style={{ height: `${Math.max(8, a.score)}%` }} />
                    <span className="text-[9px] text-muted-foreground">{a.score}%</span>
                  </div>
                ))}
              </div>
            )}
            <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => onNavigate("assessments")}>
              Open Assessments <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-primary" /> Projects Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Assigned" value={projectStat.assigned} />
              <Stat label="In Progress" value={projectStat.inProgress} />
              <Stat label="Completed" value={projectStat.completed} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Avg step completion</span>
                <span className="font-medium">{projectStat.avgStepPct}%</span>
              </div>
              <Progress value={projectStat.avgStepPct} className="h-1.5" />
            </div>
            <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => onNavigate("projects")}>
              Open Projects <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Recent Activity
            <Badge variant="secondary" className="ml-auto text-[10px]">Last {activity.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <PlayCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No activity yet — start learning to populate your timeline!
            </div>
          ) : (
            <ol className="space-y-2 max-h-[360px] overflow-y-auto">
              {activity.map((ev, i) => (
                <li key={i}>
                  <button onClick={() => onNavigate(ev.resumeTab, ev.moduleId)}
                    className="w-full flex items-center gap-3 p-2 rounded hover:bg-muted/30 transition-colors text-left group">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ActivityIcon kind={ev.kind} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-card-foreground truncate">{ev.label}</p>
                      <p className="text-[10px] text-muted-foreground">{ev.detail} · {fmtAgo(ev.ts)}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {studentId && (
        <DiagnosticAssessmentDialog
          open={diagOpen}
          onOpenChange={setDiagOpen}
          candidateId={studentId}
          candidateName={studentName}
          onComplete={() => fetchAll()}
        />
      )}
    </div>
  );
};

const KPI = ({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) => (
  <Card>
    <CardContent className="p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-display font-bold text-card-foreground leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const UsageTile = ({ icon: Icon, label, value, onClick }: { icon: typeof BookOpen; label: string; value: number; onClick: () => void }) => (
  <button onClick={onClick} className="text-center p-3 rounded-lg border border-border hover:bg-muted/30 hover:border-primary/30 transition-colors">
    <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
    <p className="text-base font-display font-bold text-card-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </button>
);

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div>
    <p className="text-lg font-display font-bold text-card-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

export default StudentOverview;
