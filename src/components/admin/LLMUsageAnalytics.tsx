import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))"];

const LLMUsageAnalytics = () => {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("llm_usage_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
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
    const map = new Map<string, { name: string; calls: number; tokens: number }>();
    rows.forEach((r) => {
      const cur = map.get(r.model) || { name: r.model, calls: 0, tokens: 0 };
      cur.calls += 1;
      cur.tokens += r.total_tokens || 0;
      map.set(r.model, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.calls - a.calls).slice(0, 8);
  }, [rows]);

  const byProvider = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.provider, (map.get(r.provider) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [rows]);

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
