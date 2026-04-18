import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Eye, Monitor, Camera, AlertTriangle, Users, Loader2, Search, Image, Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssessments } from "@/hooks/useAssessments";
import { useTrainerScope } from "@/hooks/useTrainerScope";
import { exportProctoringPDF } from "./exportProctoringPDF";

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

interface ProcLog {
  id: string;
  event_type: string;
  event_data: any;
  photo_url: string | null;
  created_at: string;
}

const ProctoringAnalytics = ({ initialSearch = "" }: { initialSearch?: string } = {}) => {
  const { assessments } = useAssessments();
  const { allowedNames } = useTrainerScope();
  const [summaries, setSummaries] = useState<ProcSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState("all");
  const [search, setSearch] = useState(initialSearch);
  const [photoModal, setPhotoModal] = useState<{ studentName: string; attemptId: string } | null>(null);
  const [photos, setPhotos] = useState<ProcLog[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [exporting, setExporting] = useState(false);

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
    if (allowedNames) result = result.filter(s => allowedNames.has(s.student_name));
    if (selectedAssessment !== "all") {
      result = result.filter(s => s.assessment_id === selectedAssessment);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => s.student_name.toLowerCase().includes(q));
    }
    return result;
  }, [summaries, selectedAssessment, search, allowedNames]);

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

  const openPhotos = async (attemptId: string, studentName: string) => {
    setPhotoModal({ studentName, attemptId });
    setPhotosLoading(true);
    setPhotoIndex(0);
    const { data } = await supabase
      .from("proctoring_logs")
      .select("*")
      .eq("attempt_id", attemptId)
      .not("photo_url", "is", null)
      .order("created_at", { ascending: true });
    setPhotos((data as any) || []);
    setPhotosLoading(false);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportProctoringPDF(filtered, assessments);
    } catch (e) {
      console.error("PDF export failed:", e);
    }
    setExporting(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-display font-bold text-foreground">Proctoring Analytics</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting || filtered.length === 0}>
          <Download className="h-4 w-4 mr-1" />
          {exporting ? "Exporting..." : "Export PDF"}
        </Button>
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
          <Input placeholder="Search candidate..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
                <th className="p-3 font-medium">Candidate</th>
                <th className="p-3 font-medium">Assessment</th>
                <th className="p-3 font-medium text-center">Tab Switches</th>
                <th className="p-3 font-medium text-center">FS Exits</th>
                <th className="p-3 font-medium text-center">No Face</th>
                <th className="p-3 font-medium text-center">Multi Face</th>
                <th className="p-3 font-medium text-center">Eye Violations</th>
                <th className="p-3 font-medium text-center">Photos</th>
                <th className="p-3 font-medium text-center">Score</th>
                <th className="p-3 font-medium text-center">Status</th>
                <th className="p-3 font-medium text-center">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-sm text-muted-foreground">No proctoring data yet</td></tr>
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
                      <span className={`text-sm font-mono ${s.tab_switch_count > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>{s.tab_switch_count}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-sm font-mono ${s.fullscreen_exit_count > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>{s.fullscreen_exit_count}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-sm font-mono ${s.face_not_detected_count > 0 ? "text-warning font-bold" : "text-muted-foreground"}`}>{s.face_not_detected_count}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-sm font-mono ${s.multiple_faces_count > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>{s.multiple_faces_count}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-sm font-mono ${s.eye_movement_violations > 0 ? "text-warning font-bold" : "text-muted-foreground"}`}>{s.eye_movement_violations}</span>
                    </td>
                    <td className="p-3 text-center text-sm text-muted-foreground">{s.photos_captured}</td>
                    <td className="p-3 text-center">
                      <span className={`text-sm font-bold ${s.proctoring_score >= 80 ? "text-success" : s.proctoring_score >= 50 ? "text-warning" : "text-destructive"}`}>{s.proctoring_score}%</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(s.status)}`}>{s.status}</span>
                    </td>
                    <td className="p-3 text-center">
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openPhotos(s.attempt_id, s.student_name)}>
                        <Image className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Review Modal */}
      {photoModal && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
          <div className="bg-card border border-border rounded-xl shadow-elevated max-w-3xl w-full max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-card-foreground">📸 Photos — {photoModal.studentName}</h4>
              <Button variant="ghost" size="sm" onClick={() => setPhotoModal(null)}><X className="h-4 w-4" /></Button>
            </div>
            {photosLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : photos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No photos captured for this session</p>
            ) : (
              <div>
                {/* Large preview */}
                <div className="relative mb-4 bg-muted rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: 240 }}>
                  <img src={photos[photoIndex].photo_url!} alt={`Capture ${photoIndex + 1}`} className="max-h-[300px] object-contain" />
                  <div className="absolute bottom-2 left-2 bg-background/80 rounded px-2 py-0.5 text-xs text-foreground">
                    {new Date(photos[photoIndex].created_at).toLocaleTimeString()} — {photos[photoIndex].event_type.replace(/_/g, " ")}
                  </div>
                  {photos.length > 1 && (
                    <>
                      <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1" onClick={() => setPhotoIndex(i => Math.max(0, i - 1))} disabled={photoIndex === 0}>
                        <ChevronLeft className="h-5 w-5 text-foreground" />
                      </button>
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1" onClick={() => setPhotoIndex(i => Math.min(photos.length - 1, i + 1))} disabled={photoIndex === photos.length - 1}>
                        <ChevronRight className="h-5 w-5 text-foreground" />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center mb-3">Photo {photoIndex + 1} of {photos.length}</p>
                {/* Thumbnail strip */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {photos.map((p, i) => (
                    <img
                      key={p.id}
                      src={p.photo_url!}
                      alt={`Thumb ${i + 1}`}
                      className={`w-16 h-12 object-cover rounded cursor-pointer border-2 ${i === photoIndex ? "border-primary" : "border-transparent"}`}
                      onClick={() => setPhotoIndex(i)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProctoringAnalytics;
