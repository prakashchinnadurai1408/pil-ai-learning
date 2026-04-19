import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { ContentSkeleton } from "@/components/LoadingFallback";

interface AssignmentRow { id: string; title: string; description: string; due_date: string | null; status: string; stream_id: string; source_type: string; created_at: string; }
interface ProgressRow { id: string; stream_id: string; project_title: string; completed_steps: any; completed_docs: any; updated_at: string; }

const StudentProjectsAnalytics = ({ studentId, studentName }: { studentId: string | null; studentName: string }) => {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    (async () => {
      const [aRes, pRes] = await Promise.all([
        supabase.from("project_assignments").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
        supabase.from("student_project_progress").select("*").eq("student_name", studentName).order("updated_at", { ascending: false }),
      ]);
      setAssignments((aRes.data as any) || []);
      setProgress((pRes.data as any) || []);
      setLoading(false);
    })();
  }, [studentId, studentName]);

  if (loading) return <ContentSkeleton />;

  const total = assignments.length;
  const completed = assignments.filter(a => a.status === "completed").length;
  const inProgress = assignments.filter(a => a.status === "in_progress" || a.status === "submitted").length;
  const assigned = assignments.filter(a => a.status === "assigned").length;

  const tiles = [
    { label: "Total Projects", value: total, icon: FolderKanban, color: "text-primary" },
    { label: "Assigned", value: assigned, icon: Clock, color: "text-warning" },
    { label: "In Progress", value: inProgress, icon: Loader2, color: "text-accent" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-success" },
  ];

  const statusColor = (s: string) =>
    s === "completed" ? "bg-success/10 text-success border-success/20" :
    s === "in_progress" || s === "submitted" ? "bg-accent/10 text-accent border-accent/20" :
    "bg-warning/10 text-warning border-warning/20";

  // Compute completion % per stream from progress
  const streamPct = progress.reduce<Record<string, number>>((acc, p) => {
    const steps = Array.isArray(p.completed_steps) ? p.completed_steps.length : Object.keys(p.completed_steps || {}).length;
    acc[p.stream_id] = Math.min(100, Math.round((steps / 10) * 100));
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-card-foreground">My Projects Analytics</h2>
        <p className="text-sm text-muted-foreground">Your project assignments, progress and completion overview.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {tiles.map(t => {
          const Icon = t.icon;
          return (
            <Card key={t.label}>
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <Icon className={`h-5 w-5 ${t.color}`} />
                <p className="text-2xl font-display font-bold text-card-foreground">{t.value}</p>
                <p className="text-xs text-muted-foreground">{t.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-display">Project List</CardTitle></CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No projects assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map(a => {
                const pct = streamPct[a.stream_id] ?? (a.status === "completed" ? 100 : 0);
                return (
                  <div key={a.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-card-foreground truncate">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Assigned {new Date(a.created_at).toLocaleDateString()}
                          {a.due_date && ` · Due ${new Date(a.due_date).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Badge className={`${statusColor(a.status)} text-[10px]`}>{a.status.replace("_", " ")}</Badge>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentProjectsAnalytics;
