import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, RefreshCw, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PlanTask {
  id: string;
  sort_order: number;
  task_type: string;
  title: string;
  description: string;
  suggested_tool: string;
  estimated_minutes: number;
  related_module_id: number | null;
  completed: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  prompt: "bg-primary/10 text-primary",
  agent: "bg-info/10 text-info",
  reflection: "bg-warning/10 text-warning",
  challenge: "bg-success/10 text-success",
};

interface Props {
  studentId: string | null;
  studentName: string;
  onNavigate?: (tool: string) => void;
}

const PracticePlanWidget = ({ studentId, studentName, onNavigate }: Props) => {
  const [summary, setSummary] = useState("");
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<{ plan_date: string; done: number; total: number }[]>([]);

  const load = async () => {
    if (!studentId) return;
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data: plan } = await supabase.from("practice_plans")
      .select("id, summary").eq("student_id", studentId).eq("plan_date", today).maybeSingle();
    if (plan) {
      setSummary(plan.summary || "");
      const { data: ts } = await supabase.from("practice_plan_tasks")
        .select("*").eq("plan_id", plan.id).order("sort_order");
      setTasks((ts as PlanTask[]) || []);
    } else {
      setSummary("");
      setTasks([]);
    }

    // Build 7-day history strip
    const since = new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10);
    const { data: recent } = await supabase.from("practice_plans")
      .select("id, plan_date").eq("student_id", studentId).gte("plan_date", since);
    const planIds = (recent || []).map((r: any) => r.id);
    let countsByPlan: Record<string, { done: number; total: number }> = {};
    if (planIds.length) {
      const { data: allTasks } = await supabase.from("practice_plan_tasks")
        .select("plan_id, completed").in("plan_id", planIds);
      for (const t of allTasks || []) {
        const k = (t as any).plan_id as string;
        countsByPlan[k] = countsByPlan[k] || { done: 0, total: 0 };
        countsByPlan[k].total += 1;
        if ((t as any).completed) countsByPlan[k].done += 1;
      }
    }
    const map = new Map<string, { done: number; total: number }>();
    for (const r of recent || []) {
      map.set((r as any).plan_date, countsByPlan[(r as any).id] || { done: 0, total: 0 });
    }
    const days: { plan_date: string; done: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      days.push({ plan_date: d, ...(map.get(d) || { done: 0, total: 0 }) });
    }
    setHistory(days);
    setLoading(false);
  };

  useEffect(() => { load(); }, [studentId]);

  const generate = async (force = false) => {
    if (!studentId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-practice-plan", {
        body: { studentId, studentName, force },
      });
      if (error) throw error;
      setSummary(data.summary || "");
      setTasks(data.tasks || []);
      if (!data.cached) toast.success("Today's practice plan is ready");
    } catch (e: any) {
      toast.error(e?.message || "Could not generate plan");
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = async (t: PlanTask) => {
    const next = !t.completed;
    setTasks((arr) => arr.map((x) => x.id === t.id ? { ...x, completed: next } : x));
    await supabase.from("practice_plan_tasks").update({
      completed: next,
      completed_at: next ? new Date().toISOString() : null,
    }).eq("id", t.id);
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Today's AI Practice Plan
          </CardTitle>
          <div className="flex items-center gap-2">
            {tasks.length > 0 && (
              <Badge variant="outline">{completedCount}/{tasks.length} done</Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => generate(true)} disabled={generating}>
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {!loading && tasks.length === 0 && (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">No plan for today yet.</p>
            <Button onClick={() => generate(false)} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate today's plan
            </Button>
          </div>
        )}
        {!loading && tasks.length > 0 && (
          <>
            {summary && <p className="text-sm text-muted-foreground italic">{summary}</p>}
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className={`p-3 rounded-lg border ${t.completed ? "bg-muted/50 border-border opacity-70" : "border-border"}`}>
                  <div className="flex items-start gap-3">
                    <Checkbox checked={t.completed} onCheckedChange={() => toggleTask(t)} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${TYPE_COLORS[t.task_type] || "bg-muted"}`}>
                          {t.task_type}
                        </span>
                        <p className={`text-sm font-medium ${t.completed ? "line-through" : ""}`}>{t.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.estimated_minutes}m</span>
                        {t.suggested_tool && (
                          <button className="text-primary hover:underline" onClick={() => onNavigate?.(t.suggested_tool)}>
                            Open {t.suggested_tool} →
                          </button>
                        )}
                      </div>
                    </div>
                    {t.completed && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PracticePlanWidget;
