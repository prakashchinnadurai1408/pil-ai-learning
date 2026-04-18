import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Zap, Search, Users, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  email: string;
  college: string;
  subscription_tier: string;
}

const StudentTierManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("id, name, email, college, subscription_tier")
      .order("name");
    if (data) setStudents(data);
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, []);

  const updateTier = async (studentId: string, newTier: string) => {
    const { error } = await supabase
      .from("students")
      .update({ subscription_tier: newTier })
      .eq("id", studentId);
    if (error) {
      toast.error("Failed to update tier");
      return;
    }
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, subscription_tier: newTier } : s));
    toast.success(`Candidate tier updated to ${newTier}`);
  };

  const bulkUpdate = async (tier: string) => {
    const filtered = filteredStudents.map(s => s.id);
    if (filtered.length === 0) return;
    const { error } = await supabase
      .from("students")
      .update({ subscription_tier: tier })
      .in("id", filtered);
    if (error) {
      toast.error("Bulk update failed");
      return;
    }
    setStudents(prev => prev.map(s => filtered.includes(s.id) ? { ...s, subscription_tier: tier } : s));
    toast.success(`${filtered.length} students updated to ${tier}`);
  };

  const filteredStudents = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()) || s.college.toLowerCase().includes(search.toLowerCase());
    const matchTier = filterTier === "all" || s.subscription_tier === filterTier;
    return matchSearch && matchTier;
  });

  const freeCount = students.filter(s => s.subscription_tier === "free").length;
  const premiumCount = students.filter(s => s.subscription_tier === "premium").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Users className="h-4 w-4" /> Student Tier Management
        </CardTitle>
        <p className="text-xs text-muted-foreground">Upgrade or downgrade students between Free and Premium tiers</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" /> Free: <span className="font-semibold">{freeCount}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-warning/10 text-sm">
            <Crown className="h-3.5 w-3.5 text-warning" /> Premium: <span className="font-semibold">{premiumCount}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, email, or institute..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterTier} onValueChange={setFilterTier}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => bulkUpdate("premium")} className="gap-1">
            <Crown className="h-3.5 w-3.5" /> Bulk → Premium
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkUpdate("free")} className="gap-1">
            <Zap className="h-3.5 w-3.5" /> Bulk → Free
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/50">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Institute</th>
                <th className="p-3 font-medium text-center">Tier</th>
                <th className="p-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">Loading students...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">No students found</td></tr>
              ) : (
                filteredStudents.slice(0, 50).map(s => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 text-sm font-medium text-card-foreground">{s.name}</td>
                    <td className="p-3 text-sm text-muted-foreground">{s.email}</td>
                    <td className="p-3 text-sm text-muted-foreground">{s.college}</td>
                    <td className="p-3 text-center">
                      <Badge variant={s.subscription_tier === "premium" ? "default" : "secondary"} className={s.subscription_tier === "premium" ? "bg-warning text-warning-foreground border-0" : ""}>
                        {s.subscription_tier === "premium" ? <Crown className="h-3 w-3 mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                        {s.subscription_tier}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1"
                        onClick={() => updateTier(s.id, s.subscription_tier === "premium" ? "free" : "premium")}
                      >
                        <ArrowUpDown className="h-3 w-3" />
                        {s.subscription_tier === "premium" ? "Downgrade" : "Upgrade"}
                      </Button>
                    </td>
                  </tr>
                ))
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
