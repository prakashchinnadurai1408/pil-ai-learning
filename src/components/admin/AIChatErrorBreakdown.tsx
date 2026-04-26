import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CreditCard, WifiOff, Cpu, CheckCircle2, Loader2 } from "lucide-react";

interface UsageRow {
  id: string;
  created_at: string;
  status: string;
  model: string;
  feature: string;
  user_name: string;
  user_role: string;
}

type Category = "billing" | "rate_limit" | "server" | "client" | "model" | "success" | "other";

const categorize = (status: string): Category => {
  if (!status) return "other";
  if (status === "success") return "success";
  if (status.includes("402")) return "billing";
  if (status.includes("429")) return "rate_limit";
  if (/_5\d\d/.test(status)) return "server";
  if (/_4\d\d/.test(status)) return "client";
  if (status.includes("model") || status.includes("timeout")) return "model";
  return "other";
};

const CATEGORY_META: Record<Category, { label: string; hint: string; icon: typeof AlertTriangle; tone: string }> = {
  billing: { label: "Billing (402)", hint: "AI credits exhausted — top up to resume live answers", icon: CreditCard, tone: "text-destructive" },
  rate_limit: { label: "Rate limit (429)", hint: "Too many requests — temporary; usually self-recovers", icon: AlertTriangle, tone: "text-warning" },
  server: { label: "Server (5xx)", hint: "Upstream AI gateway failure — retry or check status page", icon: WifiOff, tone: "text-destructive" },
  client: { label: "Client (4xx)", hint: "Bad request from the app — check edge function payload", icon: AlertTriangle, tone: "text-warning" },
  model: { label: "Model error", hint: "Model timed out or refused — try a different model", icon: Cpu, tone: "text-warning" },
  success: { label: "Success", hint: "Calls that completed normally", icon: CheckCircle2, tone: "text-success" },
  other: { label: "Other", hint: "Unclassified status codes", icon: AlertTriangle, tone: "text-muted-foreground" },
};

const AIChatErrorBreakdown = () => {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("llm_usage_logs")
        .select("id, created_at, status, model, feature, user_name, user_role")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      setRows((data as UsageRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const summary = useMemo(() => {
    const counts: Record<Category, number> = { billing: 0, rate_limit: 0, server: 0, client: 0, model: 0, success: 0, other: 0 };
    rows.forEach((r) => { counts[categorize(r.status)] += 1; });
    return counts;
  }, [rows]);

  const recentErrors = useMemo(
    () => rows.filter((r) => categorize(r.status) !== "success").slice(0, 25),
    [rows]
  );

  const totalErrors = summary.billing + summary.rate_limit + summary.server + summary.client + summary.model + summary.other;
  const errorRate = rows.length ? ((totalErrors / rows.length) * 100).toFixed(1) : "0.0";

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const categories: Category[] = ["billing", "rate_limit", "server", "client", "model", "other"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <span>AI chat error breakdown — last 7 days</span>
          <Badge variant={totalErrors > 0 ? "destructive" : "secondary"} className="text-xs">
            {totalErrors} errors / {rows.length} calls ({errorRate}%)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const count = summary[cat];
            return (
              <div key={cat} className="rounded-lg border border-border bg-muted/30 p-3" title={meta.hint}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${meta.tone}`} />
                  <span className="text-xs text-muted-foreground truncate">{meta.label}</span>
                </div>
                <p className="text-xl font-display font-bold text-card-foreground">{count}</p>
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{meta.hint}</p>
              </div>
            );
          })}
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Recent failures</h4>
          {recentErrors.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">🎉 No errors in the last 7 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left font-medium">Time</th>
                    <th className="p-2 text-left font-medium">Category</th>
                    <th className="p-2 text-left font-medium">Status</th>
                    <th className="p-2 text-left font-medium">Model</th>
                    <th className="p-2 text-left font-medium">User</th>
                    <th className="p-2 text-left font-medium">Feature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentErrors.map((r) => {
                    const cat = categorize(r.status);
                    const meta = CATEGORY_META[cat];
                    return (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="p-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="p-2 text-xs"><span className={meta.tone}>{meta.label}</span></td>
                        <td className="p-2 text-xs font-mono">{r.status}</td>
                        <td className="p-2 text-xs font-mono">{r.model}</td>
                        <td className="p-2 text-xs">{r.user_name || "—"} <span className="text-muted-foreground">({r.user_role})</span></td>
                        <td className="p-2 text-xs">{r.feature}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AIChatErrorBreakdown;
