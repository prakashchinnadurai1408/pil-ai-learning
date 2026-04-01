import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Crown, Star, Zap, Users, CreditCard, TrendingUp, Settings,
  Check, X, Plus, Edit, IndianRupee, BarChart3, Lock, Unlock
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { useMenuAccessControls, menuLabels, type MenuAccessConfig } from "@/hooks/useMenuAccessControls";

interface PlanFeature {
  name: string;
  free: boolean;
  premium: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  icon: typeof Crown;
  price: { monthly: number; yearly: number };
  color: string;
  features: string[];
  active: boolean;
}

const defaultPlans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    icon: Zap,
    price: { monthly: 0, yearly: 0 },
    color: "text-muted-foreground",
    features: [
      "Access to 3 modules",
      "Basic AI chat (5 queries/day)",
      "Video lessons (first 2 per module)",
      "Community access",
    ],
    active: true,
  },
  {
    id: "premium",
    name: "Premium",
    icon: Crown,
    price: { monthly: 499, yearly: 4999 },
    color: "text-warning",
    features: [
      "All 10+ modules unlocked",
      "Unlimited AI chat & tools",
      "All video lessons",
      "Quizzes & assessments",
      "AI Playground & Sandbox",
      "Certificate of completion",
      "Priority support",
    ],
    active: true,
  },
];

const features: PlanFeature[] = [
  // Modules
  { name: "Introduction to AI Module", free: true, premium: true },
  { name: "AI Tools for Students Module", free: true, premium: true },
  { name: "Prompt Engineering Module", free: true, premium: true },
  { name: "Multimodal AI Module", free: false, premium: true },
  { name: "AI Agents Module", free: false, premium: true },
  { name: "LLM Models Module", free: false, premium: true },
  { name: "AI Workflow Automation", free: false, premium: true },
  { name: "RAG Module", free: false, premium: true },
  { name: "Fine-Tuning Module", free: false, premium: true },
  { name: "AI SaaS Development", free: false, premium: true },
  // Videos
  { name: "Video Lessons (first 2 per module)", free: true, premium: true },
  { name: "All Video Lessons (unlimited)", free: false, premium: true },
  // AI Chat & Tools
  { name: "AI Chat Tutor (5 queries/day)", free: true, premium: true },
  { name: "AI Chat Tutor (unlimited)", free: false, premium: true },
  { name: "AI Tools Sandbox", free: false, premium: true },
  { name: "AI Playground", free: false, premium: true },
  // Coding
  { name: "Coding Challenges (5 languages)", free: true, premium: true },
  { name: "Coding Challenges (40+ languages)", free: false, premium: true },
  { name: "Coding Leaderboard", free: true, premium: true },
  // Prompt Engineering
  { name: "Prompt Lessons", free: true, premium: true },
  { name: "Prompt Challenges & Scoring", free: false, premium: true },
  { name: "Prompt Sandbox (all roles)", free: false, premium: true },
  // Assessments
  { name: "Practice Quizzes (module-based)", free: true, premium: true },
  { name: "Additional Assessments", free: false, premium: true },
  { name: "Assessment Retake", free: false, premium: true },
  // Projects
  { name: "Project Guide Access", free: false, premium: true },
  { name: "Project Document Uploads", free: false, premium: true },
  // General
  { name: "Completion Certificate", free: false, premium: true },
  { name: "Priority Support", free: false, premium: true },
];

const SubscriptionManagement = () => {
  const [plans, setPlans] = useState(defaultPlans);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const { config: menuAccess, updateAccess } = useMenuAccessControls();

  // Mock subscriber data
  const subscriberData = {
    free: 842,
    premium: 158,
    total: 1000,
    mrr: 158 * 499,
    churnRate: 3.2,
  };

  const distributionData = [
    { name: "Free", value: subscriberData.free, color: "hsl(var(--muted-foreground))" },
    { name: "Premium", value: subscriberData.premium, color: "hsl(var(--warning))" },
  ];

  const revenueData = [
    { month: "Jan", revenue: 62000 },
    { month: "Feb", revenue: 68000 },
    { month: "Mar", revenue: 74000 },
    { month: "Apr", revenue: 71000 },
    { month: "May", revenue: 78000 },
    { month: "Jun", revenue: subscriberData.mrr },
  ];

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan({ ...plan });
    setEditDialogOpen(true);
  };

  const handleSavePlan = () => {
    if (!editingPlan) return;
    setPlans(prev => prev.map(p => p.id === editingPlan.id ? editingPlan : p));
    setEditDialogOpen(false);
    toast.success(`${editingPlan.name} plan updated!`);
  };

  const handleTogglePlan = (planId: string) => {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, active: !p.active } : p));
    toast.success("Plan status updated");
  };

  return (
    <div className="space-y-6">
      {/* Revenue Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Subscribers", value: subscriberData.total.toLocaleString(), icon: Users, color: "text-primary" },
          { label: "Premium Users", value: subscriberData.premium, icon: Crown, color: "text-warning" },
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

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Revenue Trend</CardTitle>
          </CardHeader>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Subscriber Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={distributionData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {distributionData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <div>
        <h3 className="font-display font-semibold text-card-foreground mb-4">Subscription Plans</h3>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Billing:</span>
          <Button size="sm" variant={billing === "monthly" ? "default" : "outline"} onClick={() => setBilling("monthly")}>Monthly</Button>
          <Button size="sm" variant={billing === "yearly" ? "default" : "outline"} onClick={() => setBilling("yearly")}>
            Yearly <Badge variant="secondary" className="ml-1 text-xs">Save 17%</Badge>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = billing === "monthly" ? plan.price.monthly : plan.price.yearly;
            return (
              <Card key={plan.id} className={`relative ${!plan.active ? "opacity-50" : ""} ${plan.id === "premium" ? "border-warning/50 shadow-elevated" : ""}`}>
                {plan.id === "premium" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-warning text-warning-foreground border-0">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${plan.color}`} />
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={plan.active} onCheckedChange={() => handleTogglePlan(plan.id)} />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditPlan(plan)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-display font-bold text-card-foreground">
                      {price === 0 ? "Free" : `₹${price}`}
                    </span>
                    {price > 0 && <span className="text-sm text-muted-foreground">/{billing === "monthly" ? "mo" : "yr"}</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-success shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-display">Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="p-3 font-medium">Feature</th>
                  <th className="p-3 font-medium text-center">Free</th>
                  <th className="p-3 font-medium text-center">Premium</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-3 text-sm text-card-foreground">{f.name}</td>
                    <td className="p-3 text-center">
                      {f.free ? <Check className="h-4 w-4 text-success mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {f.premium ? <Check className="h-4 w-4 text-success mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Menu Access Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Settings className="h-4 w-4" /> Menu Access Controls
          </CardTitle>
          <p className="text-xs text-muted-foreground">Control which dashboard menus are accessible per subscription tier</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="p-3 font-medium">Menu</th>
                  <th className="p-3 font-medium text-center">Free Access</th>
                  <th className="p-3 font-medium text-center">Premium Access</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(menuLabels) as (keyof MenuAccessConfig)[]).map((key) => (
                  <tr key={key} className="border-b border-border/50">
                    <td className="p-3 text-sm text-card-foreground flex items-center gap-2">
                      {menuAccess[key].free ? <Unlock className="h-3.5 w-3.5 text-success" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      {menuLabels[key]}
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={menuAccess[key].free}
                        onCheckedChange={(v) => {
                          updateAccess(key, "free", v);
                          toast.success(`${menuLabels[key]} ${v ? "enabled" : "disabled"} for Free users`);
                        }}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={menuAccess[key].premium}
                        onCheckedChange={(v) => {
                          updateAccess(key, "premium", v);
                          toast.success(`${menuLabels[key]} ${v ? "enabled" : "disabled"} for Premium users`);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Plan Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingPlan?.name} Plan</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <div className="space-y-4">
              <div>
                <Label>Plan Name</Label>
                <Input value={editingPlan.name} onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Monthly Price (₹)</Label>
                  <Input type="number" value={editingPlan.price.monthly} onChange={(e) => setEditingPlan({ ...editingPlan, price: { ...editingPlan.price, monthly: Number(e.target.value) } })} />
                </div>
                <div>
                  <Label>Yearly Price (₹)</Label>
                  <Input type="number" value={editingPlan.price.yearly} onChange={(e) => setEditingPlan({ ...editingPlan, price: { ...editingPlan.price, yearly: Number(e.target.value) } })} />
                </div>
              </div>
              <div>
                <Label>Features (one per line)</Label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
                  value={editingPlan.features.join("\n")}
                  onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value.split("\n").filter(f => f.trim()) })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary border-0 text-primary-foreground" onClick={handleSavePlan}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionManagement;
