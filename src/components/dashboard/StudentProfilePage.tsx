import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User, Mail, Phone, GraduationCap, Building2, MapPin, Crown,
  Zap, BookOpen, Code2, ClipboardCheck, Trophy, Edit, Save, X, Download
} from "lucide-react";
import { toast } from "sonner";
import PasswordChangeForm from "./PasswordChangeForm";
import ActivityTimeline from "./ActivityTimeline";
import { generateProgressReport } from "./generateProgressReport";

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  mobile: string;
  college: string;
  location: string;
  degree: string;
  department: string;
  subscription_tier: string;
}

interface ProgressStats {
  modulesCompleted: number;
  totalModules: number;
  assessmentsTaken: number;
  avgScore: number;
  challengesSolved: number;
  overallProgress: number;
}

const StudentProfilePage = ({ onBack }: { onBack: () => void }) => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<ProgressStats>({
    modulesCompleted: 0, totalModules: 0, assessmentsTaken: 0,
    avgScore: 0, challengesSolved: 0, overallProgress: 0,
  });
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", mobile: "" });
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<{ type: string; title: string; detail: string; date: string }[]>([]);

  const studentId = sessionStorage.getItem("studentId");

  useEffect(() => {
    if (!studentId) return;
    const load = async () => {
      const [profileRes, progressRes, scoresRes, challengesRes] = await Promise.all([
        supabase.from("students").select("*").eq("id", studentId).single(),
        supabase.from("student_module_progress").select("*").eq("student_id", studentId),
        supabase.from("student_assessment_scores").select("*").eq("student_id", studentId),
        supabase.from("student_solved_challenges").select("id").eq("student_name", sessionStorage.getItem("studentName") || ""),
      ]);

      if (profileRes.data) {
        const p = profileRes.data as any;
        setProfile({
          id: p.id, name: p.name, email: p.email, mobile: p.mobile,
          college: p.college, location: p.location,
          degree: p.degree || "", department: p.department || "",
          subscription_tier: p.subscription_tier || "free",
        });
        setEditForm({ name: p.name, email: p.email, mobile: p.mobile });
      }

      const progressData = progressRes.data || [];
      const completed = progressData.filter((m: any) => m.completed).length;

      const scores = scoresRes.data || [];
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((sum: number, s: any) => sum + s.score, 0) / scores.length)
        : 0;

      setStats({
        modulesCompleted: completed,
        totalModules: 10,
        assessmentsTaken: scores.length,
        avgScore,
        challengesSolved: challengesRes.data?.length || 0,
        overallProgress: Math.round((completed / 10) * 100),
      });

      // Fetch activities for PDF report
      const studentName = sessionStorage.getItem("studentName") || "";
      const [progAct, scoreAct, chalAct] = await Promise.all([
        supabase.from("student_module_progress").select("*").eq("student_id", studentId).order("last_accessed", { ascending: false }).limit(10),
        supabase.from("student_assessment_scores").select("*").eq("student_id", studentId).order("attempted_at", { ascending: false }).limit(10),
        supabase.from("student_solved_challenges").select("*, coding_challenges(title)").eq("student_name", studentName).order("solved_at", { ascending: false }).limit(10),
      ]);
      const acts: { type: string; title: string; detail: string; date: string }[] = [];
      (progAct.data || []).forEach((p: any) => acts.push({ type: "module", title: `Module ${p.module_id}`, detail: p.completed ? "Completed" : `${p.progress_percent}%`, date: p.last_accessed || p.created_at }));
      (scoreAct.data || []).forEach((s: any) => acts.push({ type: "assessment", title: `Module ${s.module_id} Quiz`, detail: `Score: ${s.score}%`, date: s.attempted_at }));
      (chalAct.data || []).forEach((c: any) => acts.push({ type: "challenge", title: (c.coding_challenges as any)?.title || `Challenge`, detail: `Solved in ${c.language}`, date: c.solved_at }));
      acts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setActivities(acts.slice(0, 20));

      setLoading(false);
    };
    load();
  }, [studentId]);

  const handleSave = async () => {
    if (!profile) return;
    const { error } = await supabase.from("students").update({
      name: editForm.name, email: editForm.email, mobile: editForm.mobile,
    }).eq("id", profile.id);
    if (error) { toast.error("Failed to update profile"); return; }
    setProfile({ ...profile, ...editForm });
    sessionStorage.setItem("studentName", editForm.name);
    sessionStorage.setItem("studentMobile", editForm.mobile);
    setEditing(false);
    toast.success("Profile updated!");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!profile) return <p className="text-muted-foreground">Profile not found.</p>;

  const isPremium = profile.subscription_tier === "premium";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground">
          ← Back to Dashboard
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => generateProgressReport(profile, stats, [])}
        >
          <Download className="h-4 w-4" /> Download Report
        </Button>
      </div>

      {/* Profile Header */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary via-primary/80 to-accent" />
        <CardContent className="relative pt-0 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10">
            <div className="w-20 h-20 rounded-full bg-card border-4 border-card shadow-elevated flex items-center justify-center">
              <span className="text-2xl font-display font-bold text-primary">
                {profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-display font-bold text-card-foreground">{profile.name}</h2>
                <Badge
                  variant={isPremium ? "default" : "secondary"}
                  className={isPremium ? "bg-warning text-warning-foreground border-0 gap-1" : "gap-1"}
                >
                  {isPremium ? <Crown className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                  {profile.subscription_tier}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{profile.college}</p>
            </div>
            <Button
              size="sm"
              variant={editing ? "destructive" : "outline"}
              className="gap-1.5"
              onClick={() => {
                if (editing) { setEditForm({ name: profile.name, email: profile.email, mobile: profile.mobile }); }
                setEditing(!editing);
              }}
            >
              {editing ? <><X className="h-3.5 w-3.5" /> Cancel</> : <><Edit className="h-3.5 w-3.5" /> Edit Profile</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Modules Done", value: `${stats.modulesCompleted}/${stats.totalModules}`, icon: BookOpen, color: "text-primary" },
          { label: "Assessments", value: stats.assessmentsTaken, icon: ClipboardCheck, color: "text-accent" },
          { label: "Avg Score", value: `${stats.avgScore}%`, icon: Trophy, color: "text-warning" },
          { label: "Challenges", value: stats.challengesSolved, icon: Code2, color: "text-success" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <Icon className={`h-5 w-5 ${s.color}`} />
                <p className="text-2xl font-display font-bold text-card-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Overall Learning Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={stats.overallProgress} className="flex-1 h-3" />
            <span className="text-lg font-display font-bold text-primary">{stats.overallProgress}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-display">Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input value={editForm.mobile} onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))} />
                </div>
              </div>
              <Button onClick={handleSave} className="gap-2 bg-gradient-primary border-0 text-primary-foreground">
                <Save className="h-4 w-4" /> Save Changes
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: User, label: "Name", value: profile.name },
                { icon: Mail, label: "Email", value: profile.email },
                { icon: Phone, label: "Mobile", value: profile.mobile },
                { icon: Building2, label: "College", value: profile.college },
                { icon: MapPin, label: "Location", value: profile.location },
                { icon: GraduationCap, label: "Degree", value: profile.degree || "—" },
                { icon: BookOpen, label: "Department", value: profile.department || "—" },
                { icon: isPremium ? Crown : Zap, label: "Subscription", value: profile.subscription_tier },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium text-card-foreground">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Change */}
      <PasswordChangeForm studentId={profile.id} />

      {/* Activity Timeline */}
      <ActivityTimeline studentId={profile.id} studentName={profile.name} />
    </div>
  );
};

export default StudentProfilePage;
