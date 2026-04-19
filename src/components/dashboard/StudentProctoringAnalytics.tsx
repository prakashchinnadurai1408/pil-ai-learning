import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, Eye, Users, Camera } from "lucide-react";
import { ContentSkeleton } from "@/components/LoadingFallback";

interface SummaryRow {
  id: string;
  attempt_id: string;
  assessment_id: string;
  proctoring_score: number;
  status: string;
  tab_switch_count: number;
  fullscreen_exit_count: number;
  face_not_detected_count: number;
  multiple_faces_count: number;
  eye_movement_violations: number;
  photos_captured: number;
  created_at: string;
}

const StudentProctoringAnalytics = ({ studentId }: { studentId: string | null }) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SummaryRow[]>([]);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    supabase.from("proctoring_summary").select("*").eq("student_id", studentId).order("created_at", { ascending: false })
      .then(({ data }) => { setRows((data as any) || []); setLoading(false); });
  }, [studentId]);

  if (loading) return <ContentSkeleton />;

  const totals = rows.reduce((acc, r) => ({
    tab: acc.tab + r.tab_switch_count,
    fs: acc.fs + r.fullscreen_exit_count,
    face: acc.face + r.face_not_detected_count,
    multi: acc.multi + r.multiple_faces_count,
    eye: acc.eye + r.eye_movement_violations,
    photos: acc.photos + r.photos_captured,
  }), { tab: 0, fs: 0, face: 0, multi: 0, eye: 0, photos: 0 });
  const avgScore = rows.length ? Math.round(rows.reduce((a, b) => a + b.proctoring_score, 0) / rows.length) : 100;

  const tiles = [
    { label: "Avg Proctoring Score", value: `${avgScore}/100`, icon: ShieldCheck, color: avgScore >= 80 ? "text-success" : avgScore >= 60 ? "text-warning" : "text-destructive" },
    { label: "Tab Switches", value: totals.tab, icon: AlertTriangle, color: "text-warning" },
    { label: "Face Not Detected", value: totals.face, icon: Eye, color: "text-warning" },
    { label: "Multiple Faces", value: totals.multi, icon: Users, color: "text-warning" },
    { label: "Photos Captured", value: totals.photos, icon: Camera, color: "text-primary" },
  ];

  const statusColor = (s: string) =>
    s === "Good" ? "bg-success/10 text-success border-success/20" :
    s === "Warning" ? "bg-warning/10 text-warning border-warning/20" :
    "bg-destructive/10 text-destructive border-destructive/20";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-card-foreground">My Proctoring Analytics</h2>
        <p className="text-sm text-muted-foreground">Your conduct and integrity stats across proctored assessments.</p>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          You haven't taken any proctored assessments yet.
        </CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {tiles.map(t => {
              const Icon = t.icon;
              return (
                <Card key={t.label}>
                  <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                    <Icon className={`h-5 w-5 ${t.color}`} />
                    <p className="text-xl font-display font-bold text-card-foreground">{t.value}</p>
                    <p className="text-[11px] text-muted-foreground">{t.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm font-display">Per-Attempt Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rows.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{new Date(r.created_at).toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Tabs: {r.tab_switch_count} · Fullscreen exits: {r.fullscreen_exit_count} · Eye: {r.eye_movement_violations}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusColor(r.status)} text-[10px]`}>{r.status}</Badge>
                      <span className="text-lg font-display font-bold text-card-foreground">{r.proctoring_score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default StudentProctoringAnalytics;
