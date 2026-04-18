import { useEffect, useState } from "react";
import { useStudentModuleGroups } from "@/hooks/useModuleGroups";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layers, BookOpen } from "lucide-react";

interface Props {
  studentId: string;
  college: string;
  department: string;
  degree: string;
  onOpenModule?: (moduleId: number) => void;
}

const MyModuleGroups = ({ studentId, college, department, degree, onOpenModule }: Props) => {
  const { groups, loading } = useStudentModuleGroups(studentId, college, department, degree);
  const [progressMap, setProgressMap] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      const { data } = await supabase
        .from("student_module_progress")
        .select("module_id, progress_percent")
        .eq("student_id", studentId);
      const map: Record<number, number> = {};
      (data || []).forEach((r: any) => { map[r.module_id] = r.progress_percent || 0; });
      setProgressMap(map);
    })();
  }, [studentId]);

  if (loading) return <div className="h-24 bg-muted rounded-lg animate-pulse" />;
  if (groups.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-primary" /> My Module Groups
          <Badge variant="secondary" className="ml-auto">{groups.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {groups.map((g) => {
          const total = g.items.length;
          const overall = total === 0
            ? 0
            : Math.round(g.items.reduce((sum, it) => sum + (progressMap[it.module_id] || 0), 0) / total);
          const completed = g.items.filter((it) => (progressMap[it.module_id] || 0) >= 100).length;
          return (
            <div key={g.id} className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-card-foreground truncate">{g.name}</h4>
                  {g.description && <p className="text-xs text-muted-foreground line-clamp-1">{g.description}</p>}
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{g.owner_role}</Badge>
              </div>
              <div className="space-y-1.5 mb-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{completed}/{total} modules complete</span>
                  <span className="font-semibold text-card-foreground">{overall}%</span>
                </div>
                <Progress value={overall} className="h-1.5" />
              </div>
              <div className="flex flex-wrap gap-1">
                {g.items.slice(0, 4).map((it) => (
                  <button
                    key={it.id}
                    onClick={() => onOpenModule?.(it.module_id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 hover:bg-muted text-[10px] text-foreground transition-colors"
                    title={it.module_title}
                  >
                    <BookOpen className="h-2.5 w-2.5" />
                    <span className="truncate max-w-[120px]">{it.module_title}</span>
                  </button>
                ))}
                {g.items.length > 4 && (
                  <span className="px-2 py-0.5 rounded-full bg-muted/40 text-[10px] text-muted-foreground">
                    +{g.items.length - 4} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default MyModuleGroups;
