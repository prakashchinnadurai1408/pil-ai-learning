import { useEffect, useState } from "react";
import StudentTierManager from "./StudentTierManager";
import MenuAccessControls from "./MenuAccessControls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Star, Zap, Building2, Users, TrendingUp, Check, X, IndianRupee } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  fetchMenuRows,
  TIERS,
  TIER_META,
  type MenuRow,
  type Tier,
} from "@/hooks/useMenuAccessControls";

const PLAN_ICON: Record<Tier, typeof Crown> = {
  free: Zap,
  beginner: Star,
  advanced: Crown,
  enterprise: Building2,
};

const SubscriptionManagement = () => {
  const [studentRows, setStudentRows] = useState<MenuRow[]>([]);

  useEffect(() => { fetchMenuRows("student").then(setStudentRows); }, []);

  const subscriberData = { free: 720, beginner: 180, advanced: 80, enterprise: 20, total: 1000, mrr: 180 * 299 + 80 * 599 + 20 * 1499, churnRate: 3.2 };

  const distributionData = TIERS.map((t) => ({
    name: TIER_META[t].label,
    value: subscriberData[t],
    color: t === "free" ? "hsl(var(--muted-foreground))" : t === "beginner" ? "hsl(var(--primary))" : t === "advanced" ? "hsl(var(--accent))" : "hsl(var(--warning))",
  }));

  const revenueData = [
    { month: "Jan", revenue: 62000 }, { month: "Feb", revenue: 88000 }, { month: "Mar", revenue: 104000 },
    { month: "Apr", revenue: 121000 }, { month: "May", revenue: 138000 }, { month: "Jun", revenue: subscriberData.mrr },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Subscribers", value: subscriberData.total.toLocaleString(), icon: Users, color: "text-primary" },
          { label: "Paid Users", value: subscriberData.beginner + subscriberData.advanced + subscriberData.enterprise, icon: Crown, color: "text-warning" },
          { label: "Monthly Revenue", value: `₹${(subscriberData.mrr / 1000).toFixed(1)}K`, icon: IndianRupee, color: "text-success" },
          { label: "Churn Rate", value: `${subscriberData.churnRate}%`, icon: TrendingUp, color: "text-destructive" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card rounded-lg border border-border p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-display font-bold text-card-foreground">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Subscriber Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={distributionData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {distributionData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 4 Plan cards */}
      <div>
        <h3 className="font-display font-semibold text-card-foreground mb-4">Subscription Plans</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((t) => {
            const Icon = PLAN_ICON[t];
            const meta = TIER_META[t];
            const enabledCount = studentRows.filter(r => r[t]).length;
            return (
              <Card key={t} className={t === "advanced" ? "border-accent/50 shadow-elevated relative" : "relative"}>
                {t === "advanced" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-accent text-accent-foreground border-0">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                    <CardTitle className="text-lg">{meta.label}</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">{meta.tagline}</p>
                  <div className="text-2xl font-display font-bold text-card-foreground mt-2">{meta.price}</div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">{enabledCount} of {studentRows.length} student menus unlocked</p>
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                    {studentRows.map((r) => (
                      <li key={r.menu_key} className="flex items-center gap-2 text-xs">
                        {r[t]
                          ? <Check className="h-3.5 w-3.5 text-success shrink-0" />
                          : <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                        <span className={r[t] ? "text-card-foreground" : "text-muted-foreground line-through"}>{r.label}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          ✨ Plan contents are driven by Menu Access Controls below. Toggle a menu off for a tier to instantly remove it from this comparison and from live users' dashboards.
        </p>
      </div>

      <MenuAccessControls />

      <StudentTierManager />
    </div>
  );
};

export default SubscriptionManagement;
