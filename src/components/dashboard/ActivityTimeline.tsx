import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ClipboardCheck, Code2, Clock } from "lucide-react";
import { format } from "date-fns";

interface ActivityItem {
  id: string;
  type: "module" | "assessment" | "challenge";
  title: string;
  detail: string;
  date: string;
}

const ActivityTimeline = ({ studentId, studentName }: { studentId: string; studentName: string }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [progressRes, scoresRes, challengesRes] = await Promise.all([
        supabase.from("student_module_progress").select("*").eq("student_id", studentId).order("last_accessed", { ascending: false }).limit(10),
        supabase.from("student_assessment_scores").select("*").eq("student_id", studentId).order("attempted_at", { ascending: false }).limit(10),
        supabase.from("student_solved_challenges").select("*, coding_challenges(title)").eq("student_name", studentName).order("solved_at", { ascending: false }).limit(10),
      ]);

      const items: ActivityItem[] = [];

      (progressRes.data || []).forEach((p: any) => {
        items.push({
          id: `mod-${p.id}`,
          type: "module",
          title: `Module ${p.module_id}`,
          detail: p.completed ? "Completed" : `${p.progress_percent}% progress`,
          date: p.last_accessed || p.created_at,
        });
      });

      (scoresRes.data || []).forEach((s: any) => {
        items.push({
          id: `assess-${s.id}`,
          type: "assessment",
          title: `Module ${s.module_id} Quiz`,
          detail: `Score: ${s.score}% (${s.correct_answers}/${s.total_questions})`,
          date: s.attempted_at,
        });
      });

      (challengesRes.data || []).forEach((c: any) => {
        items.push({
          id: `chal-${c.id}`,
          type: "challenge",
          title: (c.coding_challenges as any)?.title || `Challenge #${c.challenge_id}`,
          detail: `Solved in ${c.language}`,
          date: c.solved_at,
        });
      });

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setActivities(items.slice(0, 20));
      setLoading(false);
    };
    load();
  }, [studentId, studentName]);

  const iconMap = {
    module: { icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
    assessment: { icon: ClipboardCheck, color: "text-accent", bg: "bg-accent/10" },
    challenge: { icon: Code2, color: "text-success", bg: "bg-success/10" },
  };

  const labelMap = { module: "Module", assessment: "Assessment", challenge: "Challenge" };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No activity yet. Start learning!</p>
        ) : (
          <div className="space-y-1">
            {activities.map((item, idx) => {
              const { icon: Icon, color, bg } = iconMap[item.type];
              return (
                <div key={item.id} className="flex items-start gap-3 py-3 relative">
                  {/* Timeline line */}
                  {idx < activities.length - 1 && (
                    <div className="absolute left-[15px] top-[42px] bottom-0 w-px bg-border" />
                  )}
                  <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0 z-10`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-card-foreground truncate">{item.title}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {labelMap[item.type]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {format(new Date(item.date), "MMM d, yyyy • h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityTimeline;
