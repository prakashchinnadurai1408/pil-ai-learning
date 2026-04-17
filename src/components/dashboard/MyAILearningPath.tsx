import { useCandidateLearningPath } from "@/hooks/useCandidateLearningPath";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Route, RefreshCw, ArrowRight, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  candidateId: string | null;
  onOpenModule?: (moduleId: number) => void;
}

const MyAILearningPath = ({ candidateId, onOpenModule }: Props) => {
  const { path, loading, generating, generate } = useCandidateLearningPath(candidateId);

  const handleGenerate = async () => {
    try {
      const res = await generate();
      if (res?.beginnerDefault) {
        toast.success("Beginner path created — start with Module 1!");
      } else {
        toast.success("Your personalized AI learning path is ready");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate path");
    }
  };

  if (loading) {
    return <div className="h-32 bg-muted/30 rounded-lg animate-pulse" />;
  }

  if (!path) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="py-6 text-center">
          <Wand2 className="h-10 w-10 mx-auto mb-3 text-primary" />
          <h3 className="font-display font-semibold text-lg text-card-foreground mb-1">
            Get Your AI-Powered Learning Path
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Prakash will analyze your progress, quiz scores, and coding activity to recommend the
            best modules in the right order.
          </p>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating…" : "Generate My Learning Path"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
              <Route className="h-5 w-5 text-primary" />
              {path.title}
              {path.is_beginner_default ? (
                <Badge variant="outline" className="text-xs">Beginner Track</Badge>
              ) : (
                <Badge className="text-xs gap-1"><Sparkles className="h-3 w-3" /> AI Personalized</Badge>
              )}
            </CardTitle>
            {path.rationale && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{path.rationale}</p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating} className="gap-1.5 shrink-0">
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
            {generating ? "…" : "Regenerate"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {path.modules.map((m, i) => (
          <button
            key={m.id}
            onClick={() => onOpenModule?.(m.module_id)}
            className="w-full text-left flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors group"
          >
            <div className="w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-card-foreground text-sm">{m.module_title}</div>
              {m.reason && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.reason}</div>}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
};

export default MyAILearningPath;
