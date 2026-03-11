import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, Clock, Trophy, ArrowRight } from "lucide-react";

const assessments = [
  { id: 1, title: "AI Fundamentals Quiz", module: "Introduction to AI", questions: 20, duration: "30 min", score: 85, status: "completed" as const },
  { id: 2, title: "AI Tools Proficiency", module: "AI Tools for Students", questions: 15, duration: "25 min", score: null, status: "available" as const },
  { id: 3, title: "Prompt Engineering Challenge", module: "Prompt Engineering", questions: 25, duration: "40 min", score: null, status: "available" as const },
  { id: 4, title: "LLM Knowledge Assessment", module: "LLM Models & Providers", questions: 20, duration: "30 min", score: null, status: "locked" as const },
];

const AssessmentsView = () => {
  return (
    <div className="space-y-6">
      {/* Score Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Completed", value: "1/4", icon: ClipboardCheck, color: "text-success" },
          { label: "Average Score", value: "85%", icon: Trophy, color: "text-warning" },
          { label: "Time Spent", value: "30 min", icon: Clock, color: "text-primary" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card rounded-lg border border-border p-5 shadow-card flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-display font-bold text-card-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assessment Cards */}
      <div className="space-y-4">
        {assessments.map((a) => (
          <div
            key={a.id}
            className={`bg-card rounded-lg border p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              a.status === "locked" ? "opacity-50 border-border" : "border-border"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                a.status === "completed" ? "bg-success/10" : "bg-muted"
              }`}>
                <ClipboardCheck className={`h-5 w-5 ${
                  a.status === "completed" ? "text-success" : "text-muted-foreground"
                }`} />
              </div>
              <div>
                <h4 className="font-display font-semibold text-card-foreground">{a.title}</h4>
                <p className="text-xs text-muted-foreground">{a.module} · {a.questions} questions · {a.duration}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {a.score !== null && (
                <div className="text-right">
                  <p className="text-lg font-display font-bold text-success">{a.score}%</p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
              )}
              {a.status === "available" && (
                <Button className="bg-gradient-primary border-0 text-primary-foreground gap-2" size="sm">
                  Start <ArrowRight className="h-3 w-3" />
                </Button>
              )}
              {a.status === "completed" && (
                <Button variant="outline" size="sm">Review</Button>
              )}
              {a.status === "locked" && (
                <span className="text-xs text-muted-foreground">Locked</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssessmentsView;
