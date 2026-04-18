import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Activity, Coins, Cpu, Zap } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface UsageRow {
  id: string;
  created_at: string;
  provider: string;
  model: string;
  user_role: string;
  user_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number;
  status: string;
  feature: string;
}

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))",
  "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))",
  "hsl(217 91% 60%)", "hsl(280 70% 60%)",
];

type Period = "day" | "week" | "month" | "quarter" | "year";

const periodKey = (d: Date, period: Period): string => {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  if (period === "day") return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (period === "month") return `${y}-${String(m + 1).padStart(2, "0")}`;
  if (period === "year") return `${y}`;
  if (period === "quarter") return `${y}-Q${Math.floor(m / 3) + 1}`;
  // week (ISO-ish): use Monday-anchored week start
  const tmp = new Date(Date.UTC(y, m, day));
  const dow = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() - (dow - 1));
  return `${tmp.getUTCFullYear()}-W${String(tmp.getUTCMonth() + 1).padStart(2, "0")}-${String(tmp.getUTCDate()).padStart(2, "0")}`;
};

const LLMUsageAnalytics = () => {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("day");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("llm_usage_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000);
      setRows((data as UsageRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const totalCalls = rows.length;
    const totalTokens = rows.reduce((s, r) => s + (r.total_tokens || 0), 0);
    const totalCost = rows.reduce((s, r) => s + Number(r.estimated_cost_usd || 0), 0);
    const avgLatency = rows.length
      ? Math.round(rows.reduce((s, r) => s + (r.latency_ms || 0), 0) / rows.length)
      : 0;
    return { totalCalls, totalTokens, totalCost, avgLatency };
  }, [rows]);

  const byModel = useMemo(() => {
    const map = new Map<string, { name: string; calls: number; tokens: number; cost: number }>();
    rows.forEach((r) => {
      const cur = map.get(r.model) || { name: r.model, calls: 0, tokens: 0, cost: 0 };
      cur.calls += 1;
      cur.tokens += r.total_tokens || 0;
      cur.cost += Number(r.estimated_cost_usd || 0);
      map.set(r.model, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.calls - a.calls).slice(0, 8);
  }, [rows]);

  const byProvider = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.provider, (map.get(r.provider) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [rows]);

  // Top models for stacked time-series legend (cap to 6)
  const topModels = useMemo(() => byModel.slice(0, 6).map((m) => m.name), [byModel]);

  const timeSeries = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    rows.forEach((r) => {
      const key = periodKey(new Date(r.created_at), period);
      const bucket = (map.get(key) as any) || { period: key };
      const modelKey = topModels.includes(r.model) ? r.model : "other";
      bucket[modelKey] = (bucket[modelKey] || 0) + 1;
      map.set(key, bucket);
    });
    return Array.from(map.values()).sort((a: any, b: any) => String(a.period).localeCompare(String(b.period)));
  }, [rows, period, topModels]);

  const seriesKeys = useMemo(() => {
    const keys = new Set<string>(topModels);
    timeSeries.forEach((row: any) => {
      Object.keys(row).forEach((k) => { if (k !== "period") keys.add(k); });
    });
    return Array.from(keys);
  }, [timeSeries, topModels]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Calls", value: stats.totalCalls.toLocaleString(), icon: Activity, color: "text-primary" },
          { label: "Total Tokens", value: stats.totalTokens.toLocaleString(), icon: Cpu, color: "text-accent" },
          { label: "Est. Cost (USD)", value: `$${stats.totalCost.toFixed(4)}`, icon: Coins, color: "text-success" },
          { label: "Avg Latency", value: `${stats.avgLatency} ms`, icon: Zap, color: "text-warning" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`h-5 w-5 ${s.color}`} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-2xl font-display font-bold text-card-foreground">{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Time-series usage by model */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Usage by model — over time</CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="day">Daily</TabsTrigger>
              <TabsTrigger value="week">Weekly</TabsTrigger>
              <TabsTrigger value="month">Monthly</TabsTrigger>
              <TabsTrigger value="quarter">Quarterly</TabsTrigger>
              <TabsTrigger value="year">Annual</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {timeSeries.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">No usage data in this range.</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={timeSeries} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {seriesKeys.map((key, i) => (
                  <Bar key={key} dataKey={key} stackId="usage" fill={COLORS[i % COLORS.length]} radius={i === seriesKeys.length - 1 ? [4, 4, 0, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Calls by model (top 8)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byModel} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Calls by provider</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byProvider} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {byProvider.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Per-model totals table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Model totals</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-left font-medium">Model</th>
                <th className="p-3 text-right font-medium">Calls</th>
                <th className="p-3 text-right font-medium">Tokens</th>
                <th className="p-3 text-right font-medium">Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byModel.map((m) => (
                <tr key={m.name} className="hover:bg-muted/30">
                  <td className="p-3 text-xs font-mono">{m.name}</td>
                  <td className="p-3 text-xs text-right">{m.calls.toLocaleString()}</td>
                  <td className="p-3 text-xs text-right">{m.tokens.toLocaleString()}</td>
                  <td className="p-3 text-xs text-right">${m.cost.toFixed(5)}</td>
                </tr>
              ))}
              {byModel.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No usage recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent calls (last 50)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-left font-medium">Time</th>
                <th className="p-3 text-left font-medium">User</th>
                <th className="p-3 text-left font-medium">Provider</th>
                <th className="p-3 text-left font-medium">Model</th>
                <th className="p-3 text-right font-medium">Tokens</th>
                <th className="p-3 text-right font-medium">Cost</th>
                <th className="p-3 text-right font-medium">Latency</th>
                <th className="p-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.slice(0, 50).map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3 text-xs">{r.user_name || "—"} <span className="text-muted-foreground">({r.user_role})</span></td>
                  <td className="p-3 text-xs">{r.provider}</td>
                  <td className="p-3 text-xs font-mono">{r.model}</td>
                  <td className="p-3 text-xs text-right">{r.total_tokens.toLocaleString()}</td>
                  <td className="p-3 text-xs text-right">${Number(r.estimated_cost_usd).toFixed(5)}</td>
                  <td className="p-3 text-xs text-right">{r.latency_ms} ms</td>
                  <td className="p-3 text-xs">
                    <Badge variant={r.status === "success" ? "secondary" : "destructive"} className="text-xs">{r.status}</Badge>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No usage recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LLMUsageAnalytics;
