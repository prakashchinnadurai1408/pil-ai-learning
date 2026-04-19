import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Zap, Search, Users, Sparkles, Rocket, Building2 } from "lucide-react";
import { toast } from "sonner";
import { fetchMenuRows, type MenuRow, type Tier } from "@/hooks/useMenuAccessControls";

interface Student {
  id: string;
  name: string;
  email: string;
  college: string;
  subscription_tier: string;
}

const TIERS = [
  { key: "free",       label: "Free",       icon: Zap,       cls: "bg-muted text-muted-foreground" },
  { key: "beginner",   label: "Beginner",   icon: Sparkles,  cls: "bg-primary/10 text-primary" },
  { key: "advanced",   label: "Advanced",   icon: Rocket,    cls: "bg-accent/15 text-accent-foreground" },
  { key: "enterprise", label: "Enterprise", icon: Building2, cls: "bg-warning/15 text-warning" },
] as const;

type TierKey = typeof TIERS[number]["key"];

const tierMeta = (t: string) => TIERS.find(x => x.key === t) || TIERS[0];

const StudentTierManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterCollege, setFilterCollege] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTier, setBulkTier] = useState<TierKey>("beginner");
  const [studentMenus, setStudentMenus] = useState<MenuRow[]>([]);
  const [trainerMenus, setTrainerMenus] = useState<MenuRow[]>([]);

  const fetchStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("id, name, email, college, subscription_tier")
      .order("name");
    if (data) setStudents(data as Student[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
    fetchMenuRows("student").then(setStudentMenus);
    fetchMenuRows("trainer").then(setTrainerMenus);
  }, []);

  const updateTier = async (studentId: string, newTier: string) => {
    const { error } = await supabase
      .from("students")
      .update({ subscription_tier: newTier })
      .eq("id", studentId);
    if (error) { toast.error("Failed to update tier"); return; }
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, subscription_tier: newTier } : s));
    toast.success(`Updated to ${newTier}`);
  };

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.college.toLowerCase().includes(q);
    const matchTier = filterTier === "all" || s.subscription_tier === filterTier;
    const matchCollege = filterCollege === "all" || s.college === filterCollege;
    return matchSearch && matchTier && matchCollege;
  });

  const colleges = Array.from(new Set(students.map(s => s.college).filter(Boolean))).sort();

  const bulkUpdate = async (tier: TierKey, scope: "selected" | "filtered") => {
    const ids = scope === "selected"
      ? Array.from(selectedIds)
      : filteredStudents.map(s => s.id);
    if (ids.length === 0) { toast.error("No students to update"); return; }
    const { error } = await supabase
      .from("students")
      .update({ subscription_tier: tier })
      .in("id", ids);
    if (error) { toast.error("Bulk update failed"); return; }
    setStudents(prev => prev.map(s => ids.includes(s.id) ? { ...s, subscription_tier: tier } : s));
    setSelectedIds(new Set());
    toast.success(`${ids.length} student(s) → ${tier}`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visible = filteredStudents.slice(0, 50).map(s => s.id);
    const allSelected = visible.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      visible.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const counts = TIERS.reduce((acc, t) => {
    acc[t.key] = students.filter(s => s.subscription_tier === t.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Users className="h-4 w-4" /> Student Tier Management
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Map students to Free, Beginner, Advanced, or Enterprise tiers. Tier-based access is enforced by Menu Access Controls.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TIERS.map(t => {
            const Icon = t.icon;
            const studentMenuCount = studentMenus.filter(r => r[t.key as Tier]).length;
            const trainerMenuCount = trainerMenus.filter(r => r[t.key as Tier]).length;
            return (
              <div key={t.key} className={`flex flex-col gap-1 px-3 py-2 rounded-md text-sm ${t.cls}`}>
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs">{t.label}</span>
                  <span className="ml-auto font-semibold">{counts[t.key] || 0}</span>
                </div>
                <div className="text-[10px] opacity-80 leading-tight">
                  {studentMenuCount}/{studentMenus.length} student · {trainerMenuCount}/{trainerMenus.length} trainer menus
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, email, or institute..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterTier} onValueChange={setFilterTier}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              {TIERS.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCollege} onValueChange={setFilterCollege}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Institutes" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All Institutes</SelectItem>
              {colleges.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border">
          <span className="text-xs font-medium text-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${filteredStudents.length} match filters`}
          </span>
          <span className="text-xs text-muted-foreground">→ Set to</span>
          <Select value={bulkTier} onValueChange={(v) => setBulkTier(v as TierKey)}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIERS.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" disabled={selectedIds.size === 0} onClick={() => bulkUpdate(bulkTier, "selected")}>
            Apply to selected
          </Button>
          <Button size="sm" variant="outline" disabled={filteredStudents.length === 0} onClick={() => bulkUpdate(bulkTier, "filtered")}>
            Apply to all filtered
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/50">
                <th className="p-3 w-8">
                  <Checkbox
                    checked={filteredStudents.slice(0, 50).length > 0 && filteredStudents.slice(0, 50).every(s => selectedIds.has(s.id))}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Institute</th>
                <th className="p-3 font-medium text-center">Current Tier</th>
                <th className="p-3 font-medium text-center">Change Tier</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">Loading students...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">No students found</td></tr>
              ) : (
                filteredStudents.slice(0, 50).map(s => {
                  const meta = tierMeta(s.subscription_tier);
                  const Icon = meta.icon;
                  return (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3">
                        <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                      </td>
                      <td className="p-3 text-sm font-medium text-card-foreground">{s.name}</td>
                      <td className="p-3 text-sm text-muted-foreground">{s.email}</td>
                      <td className="p-3 text-sm text-muted-foreground">{s.college}</td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary" className={`${meta.cls} border-0 gap-1`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Select value={s.subscription_tier} onValueChange={(v) => updateTier(s.id, v)}>
                          <SelectTrigger className="h-8 w-[140px] mx-auto text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TIERS.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {filteredStudents.length > 50 && (
            <p className="p-3 text-xs text-muted-foreground text-center">Showing 50 of {filteredStudents.length} students</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentTierManager;
