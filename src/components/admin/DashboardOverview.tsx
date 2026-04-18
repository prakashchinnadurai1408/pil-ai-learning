import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Video, MessageSquare, FlaskConical, ClipboardCheck, FolderKanban, Users, GraduationCap, Code2, Database, UserCheck } from "lucide-react";

interface ContentCount {
  section_type: string;
  total: number;
  published: number;
  draft: number;
}

const AGE_BUCKETS = [
  { key: "10-14", label: "10–14 yrs" },
  { key: "15-18", label: "15–18 yrs" },
  { key: "19-22", label: "19–22 yrs" },
  { key: "23+",   label: "23+ yrs" },
];

interface Trainer { id: string; name: string; college: string }
interface Student { id: string; name: string; college: string }

const SECTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  videos: { label: "Videos", icon: Video, color: "text-red-500" },
  ai_chat: { label: "AI Chat", icon: MessageSquare, color: "text-blue-500" },
  tools: { label: "Tools", icon: FlaskConical, color: "text-purple-500" },
  assessments: { label: "Assessments", icon: ClipboardCheck, color: "text-green-500" },
  projects: { label: "Projects", icon: FolderKanban, color: "text-orange-500" },
};

interface DashboardOverviewProps {
  onStudentClick?: (studentName: string) => void;
}

const DashboardOverview = ({ onStudentClick }: DashboardOverviewProps) => {
  const [contentCounts, setContentCounts] = useState<ContentCount[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [trainerCount, setTrainerCount] = useState(0);
  const [moduleCount, setModuleCount] = useState(0);
  const [challengeCount, setChallengeCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ageGroups, setAgeGroups] = useState<Record<string, number>>({});

  // Trainer-scoped panel state
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>("");
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [scopeLoading, setScopeLoading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      const [sectRes, studRes, trainRes, modRes, chalRes, qRes, trainersListRes, ageRes] = await Promise.all([
        supabase.from("admin_section_content").select("section_type, status"),
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("trainers").select("id", { count: "exact", head: true }),
        supabase.from("admin_modules").select("id", { count: "exact", head: true }),
        supabase.from("coding_challenges").select("id", { count: "exact", head: true }),
        supabase.from("quiz_question_bank").select("id", { count: "exact", head: true }),
        supabase.from("trainers").select("id, name, college").order("name"),
        supabase.from("students").select("age_group"),
      ]);

      const map: Record<string, { total: number; published: number; draft: number }> = {};
      (sectRes.data || []).forEach((r: any) => {
        if (!map[r.section_type]) map[r.section_type] = { total: 0, published: 0, draft: 0 };
        map[r.section_type].total++;
        if (r.status === "published") map[r.section_type].published++;
        else map[r.section_type].draft++;
      });

      setContentCounts(
        Object.entries(map).map(([section_type, counts]) => ({ section_type, ...counts }))
      );
      setStudentCount(studRes.count || 0);
      setTrainerCount(trainRes.count || 0);
      setModuleCount(modRes.count || 0);
      setChallengeCount(chalRes.count || 0);
      setQuestionCount(qRes.count || 0);
      setTrainers((trainersListRes.data as Trainer[]) || []);
      const ageMap: Record<string, number> = {};
      AGE_BUCKETS.forEach(b => { ageMap[b.key] = 0; });
      ((ageRes.data as any[]) || []).forEach((r) => {
        const k = (r.age_group || "").trim();
        if (k && ageMap[k] !== undefined) ageMap[k]++;
      });
      setAgeGroups(ageMap);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Load assigned students when a trainer is selected
  useEffect(() => {
    if (!selectedTrainerId) { setAssignedStudents([]); return; }
    (async () => {
      setScopeLoading(true);
      const { data: assigns } = await (supabase as any)
        .from("trainer_students").select("student_id").eq("trainer_id", selectedTrainerId);
      const ids = (assigns || []).map((a: any) => a.student_id);
      if (ids.length === 0) { setAssignedStudents([]); setScopeLoading(false); return; }
      const { data: students } = await supabase
        .from("students").select("id, name, college").in("id", ids).order("name");
      setAssignedStudents((students as Student[]) || []);
      setScopeLoading(false);
    })();
  }, [selectedTrainerId]);

  const selectedTrainer = useMemo(
    () => trainers.find(t => t.id === selectedTrainerId) || null,
    [trainers, selectedTrainerId]
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  const userCards = [
    { label: "Candidates", value: studentCount, icon: GraduationCap, color: "text-blue-500" },
    { label: "Trainers", value: trainerCount, icon: Users, color: "text-green-500" },
    { label: "Modules", value: moduleCount, icon: Database, color: "text-purple-500" },
    { label: "Coding Challenges", value: challengeCount, icon: Code2, color: "text-orange-500" },
    { label: "Quiz Questions", value: questionCount, icon: ClipboardCheck, color: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Platform Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {userCards.map(c => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`h-8 w-8 ${c.color}`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{c.value}</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trainer-scoped Assigned Students */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Trainer's Assigned Students
            </CardTitle>
            <div className="w-full md:w-72">
              <Select value={selectedTrainerId} onValueChange={setSelectedTrainerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a trainer to view assignments" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {trainers.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.college ? `· ${t.college}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedTrainerId ? (
            <p className="text-sm text-muted-foreground">Select a trainer above to see their assigned students.</p>
          ) : scopeLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : assignedStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No students assigned to <span className="font-medium text-foreground">{selectedTrainer?.name}</span> yet.
              Use Trainer Assignments to map students.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="secondary">{assignedStudents.length} students</Badge>
                <span className="text-muted-foreground">
                  assigned to <span className="font-medium text-foreground">{selectedTrainer?.name}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {assignedStudents.map(s => (
                  <Badge
                    key={s.id}
                    variant="outline"
                    className={`bg-background/50 border-primary/30 ${onStudentClick ? 'cursor-pointer hover:bg-primary/10 hover:border-primary' : ''}`}
                    title={s.college}
                    onClick={() => onStudentClick?.(s.name)}
                  >
                    {s.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold text-foreground">Content by Section</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.keys(SECTION_META).map(type => {
          const meta = SECTION_META[type];
          const Icon = meta.icon;
          const counts = contentCounts.find(c => c.section_type === type) || { total: 0, published: 0, draft: 0 };
          return (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                  {meta.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-foreground">{counts.total}</p>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span className="text-green-600">{counts.published} published</span>
                  <span className="text-yellow-600">{counts.draft} draft</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardOverview;
