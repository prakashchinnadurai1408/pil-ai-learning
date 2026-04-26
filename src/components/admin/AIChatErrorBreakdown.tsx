import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, WifiOff, Cpu, CheckCircle2, Loader2, RefreshCw, FileDown, PlayCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { markCreditsRestored } from "@/lib/aiChatDebug";

interface UsageRow {
  id: string;
  created_at: string;
  status: string;
  model: string;
  provider: string;
  feature: string;
  user_name: string;
  user_role: string;
  latency_ms: number;
  total_tokens: number;
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

const providerFamily = (model: string, provider: string): string => {
  const m = (model || "").toLowerCase();
  if (m.includes("gpt")) return "OpenAI / GPT";
  if (m.includes("claude")) return "Anthropic / Claude";
  if (m.includes("gemini")) return "Google / Gemini";
  if (m.includes("grok")) return "xAI / Grok";
  if (m.includes("deepseek")) return "DeepSeek";
  return provider || "Other";
};

const downloadIncident = (row: UsageRow) => {
  const cat = categorize(row.status);
  const meta = CATEGORY_META[cat];
  const incident = {
    incident_id: `INC-${row.id.slice(0, 8).toUpperCase()}`,
    generated_at: new Date().toISOString(),
    summary: `AI chat ${meta.label} for user "${row.user_name || "unknown"}"`,
    occurred_at: row.created_at,
    category: meta.label,
    likely_cause: meta.hint,
    upstream_status: row.status,
    model: row.model,
    provider: row.provider,
    feature: row.feature,
    user: { name: row.user_name, role: row.user_role },
    latency_ms: row.latency_ms,
    tokens: row.total_tokens,
    suggested_actions:
      cat === "billing"
        ? ["Top up Lovable AI credits at Settings → Workspace → Usage", "Verify Practice Mode fallback is serving cached examples to students"]
        : cat === "rate_limit"
        ? ["Wait a few minutes — rate limits self-recover", "Consider switching to a less-constrained model"]
        : cat === "server"
        ? ["Check Lovable AI gateway status", "Retry after a short delay", "Contact support if persistent"]
        : ["Inspect edge function logs for chat", "Verify request payload"],
  };
  const blob = new Blob([JSON.stringify(incident, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${incident.incident_id}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Incident report downloaded");
};

type RetryStatus = "idle" | "queued" | "running" | "ok" | "still_failing" | "error";

const runRetry = async (row: UsageRow): Promise<{ status: RetryStatus; message: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke("chat", {
      body: {
        messages: [{ role: "user", content: "ping" }],
        modelOverride: row.model,
        nonStream: true,
        featureTag: "admin_retry_check",
      },
    });
    if (error) return { status: "error", message: error.message || "invoke error" };
    if ((data as any)?.fallback) {
      return { status: "still_failing", message: (data as any).error || "AI unavailable" };
    }
    return { status: "ok", message: "Live AI responding" };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "unknown" };
  }
};

const retryHealthCheck = async (row: UsageRow): Promise<void> => {
  const tId = toast.loading(`Retrying ${row.model || "chat"}…`);
  const r = await runRetry(row);
  if (r.status === "ok") toast.success("Live AI is responding again ✅", { id: tId });
  else if (r.status === "still_failing") toast.warning(`Still failing: ${r.message}`, { id: tId });
  else toast.error(`Retry failed: ${r.message}`, { id: tId });
};

const AIChatErrorBreakdown = () => {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [retryStatus, setRetryStatus] = useState<Record<string, { status: RetryStatus; message?: string }>>({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, ok: 0, failed: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("llm_usage_logs")
        .select("id, created_at, status, model, provider, feature, user_name, user_role, latency_ms, total_tokens")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      setRows((data as UsageRow[]) || []);
      setLoading(false);
    })();
  }, [refreshKey]);

  const summary = useMemo(() => {
    const counts: Record<Category, number> = { billing: 0, rate_limit: 0, server: 0, client: 0, model: 0, success: 0, other: 0 };
    rows.forEach((r) => { counts[categorize(r.status)] += 1; });
    return counts;
  }, [rows]);

  // Errors grouped by provider/model family
  const byProvider = useMemo(() => {
    const map = new Map<string, Record<Category, number> & { total: number }>();
    rows.forEach((r) => {
      const cat = categorize(r.status);
      if (cat === "success") return;
      const key = providerFamily(r.model, r.provider);
      const cur = map.get(key) || { billing: 0, rate_limit: 0, server: 0, client: 0, model: 0, success: 0, other: 0, total: 0 };
      cur[cat] += 1;
      cur.total += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
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
          <div className="flex items-center gap-2">
            <Badge variant={totalErrors > 0 ? "destructive" : "secondary"} className="text-xs">
              {totalErrors} errors / {rows.length} calls ({errorRate}%)
            </Badge>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => setRefreshKey((k) => k + 1)}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
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

        {byProvider.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Errors by provider / model family</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left font-medium">Provider</th>
                    <th className="p-2 text-right font-medium">Total</th>
                    <th className="p-2 text-right font-medium">Billing</th>
                    <th className="p-2 text-right font-medium">Rate limit</th>
                    <th className="p-2 text-right font-medium">Server</th>
                    <th className="p-2 text-right font-medium">Client</th>
                    <th className="p-2 text-right font-medium">Model</th>
                    <th className="p-2 text-right font-medium">Other</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {byProvider.map(([name, c]) => (
                    <tr key={name} className="hover:bg-muted/30">
                      <td className="p-2 text-xs font-medium">{name}</td>
                      <td className="p-2 text-xs text-right font-semibold">{c.total}</td>
                      <td className="p-2 text-xs text-right">{c.billing || "—"}</td>
                      <td className="p-2 text-xs text-right">{c.rate_limit || "—"}</td>
                      <td className="p-2 text-xs text-right">{c.server || "—"}</td>
                      <td className="p-2 text-xs text-right">{c.client || "—"}</td>
                      <td className="p-2 text-xs text-right">{c.model || "—"}</td>
                      <td className="p-2 text-xs text-right">{c.other || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                    <th className="p-2 text-right font-medium">Actions</th>
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
                        <td className="p-2 text-xs text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => retryHealthCheck(r)} title="Retry — sends a tiny health-check call to this model">
                              <RefreshCw className="h-3.5 w-3.5" /> <span className="ml-1 hidden md:inline">Retry</span>
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => downloadIncident(r)} title="Download incident report (JSON)">
                              <FileDown className="h-3.5 w-3.5" /> <span className="ml-1 hidden md:inline">Report</span>
                            </Button>
                          </div>
                        </td>
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
