import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Trash2, Gauge } from "lucide-react";
import { clearSamples, summarizeBySection, type SectionStats } from "@/lib/perfMetrics";

const SECTION_LABELS: Record<string, string> = {
  overview: "Overview",
  ai_path: "Learning Paths",
  module_groups: "Module Groups",
  modules: "Modules & Videos",
  playground: "AI Chat",
  tools: "AI Tools",
  question_bank: "Question Bank",
  coding: "Coding Challenges",
  prompts: "Prompts",
  assessments: "Assessments",
  projects: "Projects",
  analytics_assessments: "Analytics · Assessments",
  analytics_proctoring: "Analytics · Proctoring",
  analytics_projects: "Analytics · Projects",
};

const fmt = (n: number) => `${Math.round(n)} ms`;
const tone = (ms: number) =>
  ms < 300 ? "text-success" : ms < 800 ? "text-warning" : "text-destructive";

const PerfMetricsPanel = () => {
  const [stats, setStats] = useState<SectionStats[]>([]);

  useEffect(() => {
    const refresh = () => setStats(summarizeBySection());
    refresh();
    const onSample = () => refresh();
    window.addEventListener("lovable:perf-sample", onSample);
    const id = window.setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("lovable:perf-sample", onSample);
      window.clearInterval(id);
    };
  }, []);

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4 text-primary" /> Section Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Browse the dashboard tabs to start collecting render and API timings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4 text-primary" /> Section Performance
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearSamples();
            setStats([]);
          }}
          className="gap-1.5 text-muted-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" /> Reset
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Section</th>
                <th className="py-2 px-3 font-medium">Samples</th>
                <th className="py-2 px-3 font-medium">Avg render</th>
                <th className="py-2 px-3 font-medium">P95 render</th>
                <th className="py-2 px-3 font-medium">Avg API</th>
                <th className="py-2 pl-3 font-medium">API calls</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.section} className="border-b border-border/40">
                  <td className="py-2 pr-3 text-card-foreground">
                    {SECTION_LABELS[s.section] ?? s.section}
                    {s.avgRenderMs > 800 && (
                      <Badge variant="outline" className="ml-2 border-destructive text-destructive">
                        slow
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{s.samples}</td>
                  <td className={`py-2 px-3 ${tone(s.avgRenderMs)}`}>{fmt(s.avgRenderMs)}</td>
                  <td className={`py-2 px-3 ${tone(s.p95RenderMs)}`}>{fmt(s.p95RenderMs)}</td>
                  <td className={`py-2 px-3 ${tone(s.avgApiMs)}`}>{fmt(s.avgApiMs)}</td>
                  <td className="py-2 pl-3 text-muted-foreground">{s.totalApiCalls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Activity className="h-3 w-3" /> Render = mount → first idle frame · API = avg fetch
          duration during mount. Stored locally on this device.
        </p>
      </CardContent>
    </Card>
  );
};

export default PerfMetricsPanel;
