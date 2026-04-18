import { useProjectAssignments } from "@/hooks/useProjectAssignments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderKanban, Calendar, User, Sparkles, ChevronRight } from "lucide-react";

interface Props {
  studentId: string;
  onOpenStream?: (streamId: string) => void;
}

const MyAssignedProjects = ({ studentId, onOpenStream }: Props) => {
  const { assignments, loading } = useProjectAssignments({ studentId });

  if (loading) return <div className="h-24 bg-muted rounded-lg animate-pulse" />;
  if (assignments.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> Projects Assigned to You
          <Badge variant="secondary" className="ml-auto">{assignments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {assignments.map((a) => (
          <div key={a.id} className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="font-medium text-sm text-card-foreground">{a.title}</h4>
                  <Badge variant="outline" className="text-[10px] capitalize">{a.status.replace("_", " ")}</Badge>
                  <Badge variant="secondary" className="text-[10px] capitalize">{a.source_type}</Badge>
                </div>
                {a.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{a.description}</p>}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                  <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {a.assigner_name} ({a.assigner_role})</span>
                  {a.due_date && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Due {new Date(a.due_date).toLocaleDateString()}</span>}
                </div>
              </div>
              {a.source_type === "guide" && a.stream_id && onOpenStream && (
                <Button size="sm" variant="outline" onClick={() => onOpenStream(a.stream_id)} className="gap-1 text-xs h-8">
                  Open Guide <ChevronRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MyAssignedProjects;
