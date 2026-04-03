import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Eye, Monitor, Camera, AlertTriangle, Users, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssessments } from "@/hooks/useAssessments";

interface ProcSummary {
  id: string;
  attempt_id: string;
  assessment_id: string;
  student_id: string;
  student_name: string;
  tab_switch_count: number;
  fullscreen_exit_count: number;
  face_not_detected_count: number;
  multiple_faces_count: number;
  eye_movement_violations: number;
  photos_captured: number;
  proctoring_score: number;
  status: string;
  created_at: string;
}

const ProctoringAnalytics = () => {
  const { assessments } = useAssessments();
  const [summaries, setSummaries] = useState<ProcSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("proctoring_summary")
        .select("*")
        .order("created_at", { ascending: false });
      setSummaries((data as any) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const proctoredAssessments = useMemo(
    () => assessments.filter(a => (a as any).proctoring_enabled),
    [assessments]
  );

  const filtered = useMemo(() => {
    let result = summaries;
    if (selectedAssessment !== "all") {
      result = result.filter(s => s.assessment_id === selectedAssessment);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => s.student_name.toLowerCase().includes(q));
    }
    return result;
  }, [summaries, selectedAssessment, search]);

  const overallStats = useMemo(() => {
    if (filtered.length === 0) return null;
    const avg = Math.round(filtered.reduce((a, s) => a + s.proctoring_score, 0) / filtered.length);
    const good = filtered.filter(s => s.status === "Good").length;
    const average = filtered.filter(s => s.status === "Average").length;
    const poor = filtered.filter(s => s.status === "Poor").length;
    return { avg, good, average, poor, total: filtered.length };
  }, [filtered]);

  const statusColor = (s: string) =>
    s === "Good" ? "text-success bg-success/10" : s === "Average" ? "text-warning bg-warning/10" : "text-destructive bg-destructive/10";

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-display font-bold text-foreground">Proctoring Analytics</h3>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
          <SelectTrigger className="w-64"><SelectValue placeholder="All Proctored Assessments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Proctored Assessments</SelectItem>
            {proctoredAssessments.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search student..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Stats cards */}
      {overallStats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-card border border-border rounded-lg p-4 shadow-card">
            <Users className="h-4 w-4 text-primary mb-2" />
            <p className="text-xl font-display font-bold text-card-foreground">{overallStats.total}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 shadow-card">
            <Shield className="h-4 w-4 text-primary mb-2" />
            <p className="text-xl font-display font-bold text-card-foreground">{overallStats.avg}%</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 shadow-card">
            <p className="text-xl font-display font-bold text-success">{overallStats.good}</p>
            <p className="text-xs text-muted-foreground">Good</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 shadow-card">
            <p className="text-xl font-display font-bold text-warning">{overallStats.average}</p>
            <p className="text-xs text-muted-foreground">Average</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 shadow-card">
            <p className="text-xl font-display font-bold text-destructive">{overallStats.poor}</p>
            <p className="text-xs text-muted-foreground">Poor</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">Student</th>
                <th className="p-3 font-medium">Assessment</th>
                <th className="p-3 font-medium text-center">Tab Switches</th>
                <th className="p-3 font-medium text-center">FS Exits</th>
                <th className="p-3 font-medium text-center">No Face</th>
                <th className="p-3 font-medium text-center">Multi Face</th>
                <th className="p-3 font-medium text-center">Eye Violations</th>
                <th className="p-3 font-medium text-center">Photos</th>
                <th className="p-3 font-medium text-center">Score</th>
                <th className="p-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-sm text-muted-foreground">No proctoring data yet</td></tr>
              ) : filtered.map(s => {
                const assessment = assessments.find(a => a.id === s.assessment_id);
                return (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                          {s.student_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-card-foreground">{s.student_name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{assessment?.title || "—"}</td>
                    <td className="p-3 text-center">
                      <span className={`text-sm font-mono ${s.tab_switch_count > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                        {s.tab_switch_count}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-sm font-mono ${s.fullscreen_exit_count > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                        {s.fullscreen_exit_count}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-sm font-mono ${s.face_not_detected_count > 0 ? "text-warning font-bold" : "text-muted-foreground"}`}>
                        {s.face_not_detected_count}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-sm font-mono ${s.multiple_faces_count > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                        {s.multiple_faces_count}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-sm font-mono ${s.eye_movement_violations > 0 ? "text-warning font-bold" : "text-muted-foreground"}`}>
                        {s.eye_movement_violations}
                      </span>
                    </td>
                    <td className="p-3 text-center text-sm text-muted-foreground">{s.photos_captured}</td>
                    <td className="p-3 text-center">
                      <span className={`text-sm font-bold ${s.proctoring_score >= 80 ? "text-success" : s.proctoring_score >= 50 ? "text-warning" : "text-destructive"}`}>
                        {s.proctoring_score}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(s.status)}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProctoringAnalytics;
