import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Plus, Loader2, Upload, Database, ClipboardCheck,
  Search, ArrowRight, X, Pencil, Shield, Trash2, FileText, CalendarRange
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminModules } from "@/hooks/useAdminModules";
import { useModuleGroups } from "@/hooks/useModuleGroups";
import {
  useAssessments,
  createAssessment,
  updateAssessment,
  type QuestionType,
} from "@/hooks/useAssessments";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TypedQuestionEditor, { emptyQuestion, type QuestionDraft } from "./TypedQuestionEditor";
import AssessmentMixPreview from "./AssessmentMixPreview";

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (val: string): string | null => (val ? new Date(val).toISOString() : null);

const AssessmentCreator = () => {
  const { adminModules } = useAdminModules();
  const { groups: moduleGroups } = useModuleGroups({ ownerRole: "admin" });
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const { assessments, loading: loadingAssessments, refetch } = useAssessments();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Assessment metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([]);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<string>("");
  const [maxAttempts, setMaxAttempts] = useState<string>("");
  const [passingScore, setPassingScore] = useState("60");
  const [assignedColleges, setAssignedColleges] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion("mcq")]);
  const [showForm, setShowForm] = useState(false);
  const [proctoringEnabled, setProctoringEnabled] = useState(false);

  // Source mode (Topic vs JD)
  const [sourceMode, setSourceMode] = useState<"topic" | "jd">("topic");
  const [topicOrSkills, setTopicOrSkills] = useState("");
  const [jdText, setJdText] = useState("");
  const [jdFileUrl, setJdFileUrl] = useState("");
  const [uploadingJd, setUploadingJd] = useState(false);

  // Schedule window
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");

  // AI mix
  const [mixMcq, setMixMcq] = useState("5");
  const [mixDescriptive, setMixDescriptive] = useState("2");
  const [mixVideo, setMixVideo] = useState("0");
  const [mixCoding, setMixCoding] = useState("0");
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [aiCodingLang, setAiCodingLang] = useState("python");
  const [generating, setGenerating] = useState(false);

  // Question bank
  const [bankQuestions, setBankQuestions] = useState<QuestionDraft[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [bankModuleFilters, setBankModuleFilters] = useState<number[]>([]);
  const [bankGroupId, setBankGroupId] = useState<string>("all");
  const [selectedBankIds, setSelectedBankIds] = useState<Set<number>>(new Set());

  // Colleges
  const [colleges, setColleges] = useState<string[]>([]);
  const [collegeSearch, setCollegeSearch] = useState("");
  useEffect(() => {
    supabase.from("colleges").select("name").then(({ data }) => {
      if (data) setColleges(data.map((c: any) => c.name));
    });
  }, []);

  const filteredColleges = useMemo(() => {
    if (!collegeSearch.trim()) return colleges;
    const q = collegeSearch.toLowerCase();
    return colleges.filter(c => c.toLowerCase().includes(q));
  }, [colleges, collegeSearch]);

  // ---- Question helpers ----
  const addQuestion = (type: QuestionType = "mcq") => setQuestions([...questions, emptyQuestion(type)]);
  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };
  const updateQuestion = (idx: number, next: QuestionDraft) => {
    setQuestions(questions.map((q, i) => (i === idx ? next : q)));
  };

  const toggleModule = (id: number) =>
    setSelectedModuleIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  const toggleCollege = (c: string) =>
    setAssignedColleges(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]));
  const toggleBankModule = (id: number) =>
    setBankModuleFilters(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  // ---- JD upload ----
  const handleJdUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingJd(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `jd/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("assessment-uploads").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("assessment-uploads").getPublicUrl(path);
      setJdFileUrl(pub.publicUrl);

      // For .txt files we can read inline; for PDF/DOCX, ask user to also paste text.
      if (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt")) {
        const text = await file.text();
        setJdText(prev => prev || text);
      } else {
        toast.info("JD file uploaded. Paste the JD text below for AI to read it.");
      }
      toast.success("JD file uploaded");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload JD: " + (err?.message || "unknown error"));
    } finally {
      setUploadingJd(false);
      e.target.value = "";
    }
  }, []);

  // ---- AI generation ----
  const handleAIGenerate = async () => {
    const mix = {
      mcq: Math.max(0, parseInt(mixMcq) || 0),
      descriptive: Math.max(0, parseInt(mixDescriptive) || 0),
      video: Math.max(0, parseInt(mixVideo) || 0),
      coding: Math.max(0, parseInt(mixCoding) || 0),
    };
    const total = mix.mcq + mix.descriptive + mix.video + mix.coding;
    if (total === 0) { toast.error("Set at least one question count > 0"); return; }
    if (sourceMode === "topic" && !topicOrSkills.trim()) { toast.error("Enter topic / skills"); return; }
    if (sourceMode === "jd" && !jdText.trim()) { toast.error("Paste or upload a Job Description text"); return; }

    setGenerating(true);
    try {
      // Split the requested mix into batches of up to 5 questions per call
      // (across all types) to stay within the edge function's ~25s window.
      const BATCH_SIZE = 5;
      const buildBatches = (m: typeof mix): Array<typeof mix> => {
        const batches: Array<typeof mix> = [];
        const remaining = { ...m };
        while (remaining.mcq + remaining.descriptive + remaining.video + remaining.coding > 0) {
          const batch = { mcq: 0, descriptive: 0, video: 0, coding: 0 };
          let budget = BATCH_SIZE;
          (["mcq", "descriptive", "video", "coding"] as const).forEach((k) => {
            if (budget <= 0) return;
            const take = Math.min(remaining[k], budget);
            batch[k] = take;
            remaining[k] -= take;
            budget -= take;
          });
          batches.push(batch);
        }
        return batches;
      };

      const batches = buildBatches(mix);
      const allQs: QuestionDraft[] = [];
      let lastError = "";

      for (let i = 0; i < batches.length; i++) {
        const b = batches[i];
        toast.info(`Generating batch ${i + 1} of ${batches.length}…`);
        try {
          const { data, error } = await supabase.functions.invoke("generate-assessment-questions", {
            body: {
              source_mode: sourceMode,
              topic_or_skills: topicOrSkills,
              jd_text: jdText,
              mix: b,
              module_id: selectedModuleIds[0] || null,
              difficulty: aiDifficulty,
              language: aiCodingLang,
            },
          });
          if (error || data?.error) {
            lastError = data?.error || error?.message || "Failed";
            continue;
          }
          const aiQs: QuestionDraft[] = (data?.questions || []).map((q: any) => ({
            question: q.question,
            options: q.options || [],
            correct: typeof q.correct === "number" ? q.correct : null,
            explanation: q.explanation || "",
            source: "ai",
            question_type: q.question_type,
            expected_answer: q.expected_answer || "",
            max_score: q.max_score ?? 1,
            time_limit_seconds: q.time_limit_seconds ?? null,
            starter_code: q.starter_code || "",
            language: q.language || "",
          }));
          allQs.push(...aiQs);
        } catch (e: any) {
          lastError = e?.message || "Failed";
        }
      }

      if (allQs.length === 0) {
        toast.error("AI generation failed: " + (lastError || "no questions returned"));
        return;
      }
      setQuestions(prev => [...prev.filter(q => q.question.trim()), ...allQs]);
      toast.success(`Generated ${allQs.length} AI question(s) across ${batches.length} batch(es)!`);
    } catch (err: any) {
      console.error(err);
      toast.error("AI generation failed: " + (err?.message || ""));
    } finally {
      setGenerating(false);
    }
  };

  // ---- Question bank ----
  const loadQuestionBank = async () => {
    setLoadingBank(true);
    let modIds: number[] = bankModuleFilters;
    if (bankGroupId !== "all") {
      const g = moduleGroups.find(gr => gr.id === bankGroupId);
      const groupModuleIds = g?.items.map(it => it.module_id) || [];
      modIds = bankModuleFilters.length > 0
        ? bankModuleFilters.filter(id => groupModuleIds.includes(id))
        : groupModuleIds;
      if (modIds.length === 0) {
        setBankQuestions([]); setLoadingBank(false);
        toast.info("No modules in selected group match the filter.");
        return;
      }
    }
    let query = supabase.from("quiz_question_bank").select("*").order("created_at", { ascending: false });
    if (modIds.length > 0) query = query.in("module_id", modIds);
    const { data } = await query;
    setBankQuestions((data || []).map((q: any) => ({
      question: q.question,
      options: Array.isArray(q.options) ? q.options : (typeof q.options === "string" ? JSON.parse(q.options) : []),
      correct: typeof q.correct === "number" ? q.correct : null,
      explanation: q.explanation || "",
      source: "bank",
      question_type: q.question_type || "mcq",
      expected_answer: q.expected_answer || "",
      max_score: q.question_type === "mcq" || !q.question_type ? 1 : 5,
      time_limit_seconds: q.question_type === "video" ? 120 : null,
      starter_code: "",
      language: "",
    })));
    setSelectedBankIds(new Set());
    setLoadingBank(false);
  };

  const importSelectedFromBank = () => {
    const selected = Array.from(selectedBankIds).map(i => bankQuestions[i]);
    setQuestions(prev => [...prev.filter(q => q.question.trim()), ...selected]);
    toast.success(`Imported ${selected.length} questions from bank`);
    setBankQuestions([]); setSelectedBankIds(new Set());
  };

  // ---- Edit / reset ----
  const handleEdit = async (assessment: any) => {
    setEditingId(assessment.id);
    setTitle(assessment.title);
    setDescription(assessment.description);
    setSelectedModuleIds(assessment.module_id ? [assessment.module_id] : []);
    setTimeLimitMinutes(assessment.time_limit_minutes ? String(assessment.time_limit_minutes) : "");
    setMaxAttempts(assessment.max_attempts ? String(assessment.max_attempts) : "");
    setPassingScore(String(assessment.passing_score));
    setAssignedColleges(assessment.assigned_colleges || []);
    setProctoringEnabled(assessment.proctoring_enabled || false);
    setSourceMode((assessment.source_mode as "topic" | "jd") || "topic");
    setTopicOrSkills(assessment.topic_or_skills || "");
    setJdText(assessment.jd_text || "");
    setJdFileUrl(assessment.jd_file_url || "");
    setStartAt(toLocalInput(assessment.start_at));
    setEndAt(toLocalInput(assessment.end_at));
    const mix = assessment.question_mix || {};
    setMixMcq(String(mix.mcq ?? 0));
    setMixDescriptive(String(mix.descriptive ?? 0));
    setMixVideo(String(mix.video ?? 0));
    setMixCoding(String(mix.coding ?? 0));

    const { data } = await supabase.from("assessment_questions").select("*").eq("assessment_id", assessment.id).order("sort_order");
    if (data && data.length > 0) {
      setQuestions(data.map((q: any) => ({
        question: q.question,
        options: Array.isArray(q.options) ? q.options : (typeof q.options === "string" ? JSON.parse(q.options) : []),
        correct: typeof q.correct === "number" ? q.correct : null,
        explanation: q.explanation || "",
        source: q.source || "manual",
        question_type: q.question_type || "mcq",
        expected_answer: q.expected_answer || "",
        max_score: q.max_score ?? 1,
        time_limit_seconds: q.time_limit_seconds ?? null,
        starter_code: q.starter_code || "",
        language: q.language || "",
      })));
    } else {
      setQuestions([emptyQuestion("mcq")]);
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setSelectedModuleIds([]);
    setTimeLimitMinutes(""); setMaxAttempts(""); setPassingScore("60");
    setAssignedColleges([]); setQuestions([emptyQuestion("mcq")]);
    setEditingId(null); setShowForm(false); setProctoringEnabled(false);
    setSourceMode("topic"); setTopicOrSkills(""); setJdText(""); setJdFileUrl("");
    setStartAt(""); setEndAt("");
    setMixMcq("5"); setMixDescriptive("2"); setMixVideo("0"); setMixCoding("0");
  };

  // ---- Save ----
  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Enter assessment title"); return; }
    const validQs = questions.filter(q => {
      if (!q.question.trim()) return false;
      if (q.question_type === "mcq") return q.options.every(o => o.trim());
      return true;
    });
    if (validQs.length === 0) { toast.error("Add at least one complete question"); return; }
    setCreating(true);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      module_id: selectedModuleIds[0] || null,
      assigned_colleges: assignedColleges,
      time_limit_minutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
      max_attempts: maxAttempts ? Number(maxAttempts) : null,
      passing_score: Number(passingScore) || 60,
      proctoring_enabled: proctoringEnabled,
      source_mode: sourceMode,
      topic_or_skills: topicOrSkills,
      jd_text: jdText,
      jd_file_url: jdFileUrl,
      start_at: fromLocalInput(startAt),
      end_at: fromLocalInput(endAt),
      question_mix: {
        mcq: parseInt(mixMcq) || 0,
        descriptive: parseInt(mixDescriptive) || 0,
        video: parseInt(mixVideo) || 0,
        coding: parseInt(mixCoding) || 0,
      },
      questions: validQs,
    };

    if (editingId) {
      await updateAssessment(editingId, payload);
    } else {
      const creatorName = sessionStorage.getItem("trainerName") || sessionStorage.getItem("adminEmail") || "Admin";
      const creatorRole = sessionStorage.getItem("trainerName") ? "trainer" : "admin";
      await createAssessment({ ...payload, created_by: creatorRole, created_by_name: creatorName });
    }

    resetForm(); setCreating(false); refetch();
  };

  const handleDeleteAssessment = async (id: string) => {
    const { error } = await supabase.from("assessments").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Assessment deleted"); refetch();
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    const { error } = await supabase.from("assessments").update({ status: newStatus } as any).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    toast.success(`Assessment ${newStatus}`); refetch();
  };

  // -----------------------------------------------------------------------
  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-bold text-foreground">
            {editingId ? "Edit Assessment" : "Create Assessment"}
          </h3>
          <Button variant="ghost" onClick={resetForm}>← Back to List</Button>
        </div>

        {/* Step 1: Source */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> 1. Source — Topic / Skills or Job Description</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={sourceMode === "topic" ? "default" : "outline"}
                onClick={() => setSourceMode("topic")}
              >Topic / Skills</Button>
              <Button
                size="sm"
                variant={sourceMode === "jd" ? "default" : "outline"}
                onClick={() => setSourceMode("jd")}
              >Job Description</Button>
            </div>
            {sourceMode === "topic" ? (
              <Textarea
                placeholder="e.g., Machine Learning fundamentals, Python OOP, SQL joins..."
                value={topicOrSkills}
                onChange={(e) => setTopicOrSkills(e.target.value)}
                rows={3}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg cursor-pointer hover:bg-muted text-xs">
                    {uploadingJd ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    Upload JD (PDF / DOCX / TXT)
                    <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleJdUpload} disabled={uploadingJd} />
                  </label>
                  {jdFileUrl && (
                    <a href={jdFileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">view uploaded file</a>
                  )}
                </div>
                <Textarea
                  placeholder="Paste the Job Description text here (required for AI generation)..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  rows={6}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Details */}
        <Card>
          <CardHeader><CardTitle className="text-sm">2. Assessment Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Module 1 Final Assessment" />
              </div>
              <div>
                <Label>Passing Score (%)</Label>
                <Input type="number" value={passingScore} onChange={e => setPassingScore(e.target.value)} placeholder="60" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Assessment description..." rows={2} />
            </div>

            <div>
              <Label>Module Group (optional filter)</Label>
              <Select value={selectedGroupId} onValueChange={(v) => { setSelectedGroupId(v); setSelectedModuleIds([]); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All modules" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  {moduleGroups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name} ({g.items.length})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Modules (select multiple)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(() => {
                  const allowed = selectedGroupId === "all"
                    ? adminModules
                    : adminModules.filter(m => {
                        const g = moduleGroups.find(gr => gr.id === selectedGroupId);
                        return g?.items.some(it => it.module_id === m.id);
                      });
                  if (allowed.length === 0) {
                    return <p className="text-xs text-muted-foreground">No modules in this group.</p>;
                  }
                  return allowed.map(m => (
                    <label key={m.id} className="flex items-center gap-1.5 text-xs bg-muted px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-muted/80">
                      <Checkbox checked={selectedModuleIds.includes(m.id)} onCheckedChange={() => toggleModule(m.id)} />
                      {m.title}
                    </label>
                  ));
                })()}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Time Limit (minutes)</Label>
                <Input type="number" value={timeLimitMinutes} onChange={e => setTimeLimitMinutes(e.target.value)} placeholder="No limit" />
              </div>
              <div>
                <Label>Max Attempts</Label>
                <Input type="number" value={maxAttempts} onChange={e => setMaxAttempts(e.target.value)} placeholder="Unlimited" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1"><CalendarRange className="h-3 w-3" /> Start (visible from)</Label>
                <Input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
              </div>
              <div>
                <Label className="flex items-center gap-1"><CalendarRange className="h-3 w-3" /> End (closes at)</Label>
                <Input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <div>
                  <Label className="text-sm font-medium">Enable Proctoring</Label>
                  <p className="text-xs text-muted-foreground">Camera, fullscreen lock, tab switch, face detection</p>
                </div>
              </div>
              <Switch checked={proctoringEnabled} onCheckedChange={setProctoringEnabled} />
            </div>

            {/* Institutes */}
            <div>
              <Label>Assign to Institutes</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search institutes..." className="pl-9 mb-2" value={collegeSearch} onChange={e => setCollegeSearch(e.target.value)} />
              </div>
              {assignedColleges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {assignedColleges.map(c => (
                    <span key={c} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {c}
                      <button onClick={() => toggleCollege(c)}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredColleges.map(c => (
                  <label key={c} className="flex items-center gap-1.5 text-xs bg-muted px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-muted/80">
                    <Checkbox checked={assignedColleges.includes(c)} onCheckedChange={() => toggleCollege(c)} />
                    {c}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {assignedColleges.length === 0 ? "No institutes selected = visible to all students" : `Assigned to ${assignedColleges.length} institute(s)`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Questions */}
        <Card>
          <CardHeader><CardTitle className="text-sm">3. Questions</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="ai">
              <TabsList className="mb-4">
                <TabsTrigger value="ai" className="gap-1 text-xs"><Sparkles className="h-3 w-3" /> AI Generate</TabsTrigger>
                <TabsTrigger value="manual" className="gap-1 text-xs"><Plus className="h-3 w-3" /> Manual</TabsTrigger>
                <TabsTrigger value="bank" className="gap-1 text-xs"><Database className="h-3 w-3" /> Question Bank</TabsTrigger>
              </TabsList>

              {/* AI Generate */}
              <TabsContent value="ai" className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">MCQ</Label>
                    <Input type="number" min={0} value={mixMcq} onChange={e => setMixMcq(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Descriptive</Label>
                    <Input type="number" min={0} value={mixDescriptive} onChange={e => setMixDescriptive(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Video</Label>
                    <Input type="number" min={0} value={mixVideo} onChange={e => setMixVideo(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Coding</Label>
                    <Input type="number" min={0} value={mixCoding} onChange={e => setMixCoding(e.target.value)} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Difficulty</Label>
                    <Select value={aiDifficulty} onValueChange={(v) => setAiDifficulty(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {parseInt(mixCoding) > 0 && (
                    <div>
                      <Label className="text-xs">Coding language</Label>
                      <Input value={aiCodingLang} onChange={e => setAiCodingLang(e.target.value)} placeholder="python" />
                    </div>
                  )}
                </div>
                <Button onClick={handleAIGenerate} disabled={generating} className="gap-2 bg-gradient-accent border-0">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generating ? "Generating..." : `Generate ${(parseInt(mixMcq)||0)+(parseInt(mixDescriptive)||0)+(parseInt(mixVideo)||0)+(parseInt(mixCoding)||0)} questions`}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Source: <strong>{sourceMode === "topic" ? "Topic/Skills" : "Job Description"}</strong>. Edit any AI question below before saving.
                </p>
              </TabsContent>

              {/* Manual */}
              <TabsContent value="manual" className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => addQuestion("mcq")} className="gap-1"><Plus className="h-3 w-3" /> MCQ</Button>
                  <Button variant="outline" size="sm" onClick={() => addQuestion("descriptive")} className="gap-1"><Plus className="h-3 w-3" /> Descriptive</Button>
                  <Button variant="outline" size="sm" onClick={() => addQuestion("video")} className="gap-1"><Plus className="h-3 w-3" /> Video</Button>
                  <Button variant="outline" size="sm" onClick={() => addQuestion("coding")} className="gap-1"><Plus className="h-3 w-3" /> Coding</Button>
                </div>
                <p className="text-xs text-muted-foreground">All added questions appear in the editor below.</p>
              </TabsContent>

              {/* Bank */}
              <TabsContent value="bank" className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Module Group</Label>
                    <Select value={bankGroupId} onValueChange={setBankGroupId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All groups</SelectItem>
                        {moduleGroups.map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block text-xs">Filter by Modules (optional)</Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {adminModules.map(m => (
                      <label key={m.id} className="flex items-center gap-1.5 text-xs bg-muted px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-muted/80">
                        <Checkbox checked={bankModuleFilters.includes(m.id)} onCheckedChange={() => toggleBankModule(m.id)} />
                        {m.title}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={loadQuestionBank} disabled={loadingBank} variant="outline" className="gap-1">
                      {loadingBank ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                      Load Questions
                    </Button>
                    {selectedBankIds.size > 0 && (
                      <Button onClick={importSelectedFromBank} className="gap-1 bg-gradient-primary border-0 text-primary-foreground">
                        <ArrowRight className="h-3 w-3" /> Import {selectedBankIds.size} Selected
                      </Button>
                    )}
                  </div>
                </div>
                {bankQuestions.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {bankQuestions.map((q, i) => (
                      <label key={i} className="flex items-start gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30">
                        <Checkbox checked={selectedBankIds.has(i)} onCheckedChange={() => {
                          setSelectedBankIds(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; });
                        }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">{q.question_type}</span>
                          </div>
                          <p className="text-sm font-medium">{q.question}</p>
                          {q.question_type === "mcq" && q.options.length > 0 && (
                            <p className="text-xs text-muted-foreground">{q.options.map((o, oi) => `${String.fromCharCode(65 + oi)}) ${o}`).join(" · ")}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Editor list (always visible) */}
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Questions ({questions.filter(q => q.question.trim()).length})</h4>
              {questions.map((q, qi) => (
                <TypedQuestionEditor
                  key={qi}
                  index={qi}
                  question={q}
                  onChange={(next) => updateQuestion(qi, next)}
                  onRemove={() => removeQuestion(qi)}
                  canRemove={questions.length > 1}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Review preview */}
        <AssessmentMixPreview
          questions={questions}
          difficulty={aiDifficulty}
          plannedMix={{
            mcq: parseInt(mixMcq) || 0,
            descriptive: parseInt(mixDescriptive) || 0,
            video: parseInt(mixVideo) || 0,
            coding: parseInt(mixCoding) || 0,
          }}
        />

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg sticky bottom-0">
          <p className="text-sm"><strong>{questions.filter(q => q.question.trim()).length}</strong> questions ready</p>
          <Button onClick={handleCreate} disabled={creating} className="gap-2 bg-gradient-primary border-0 text-primary-foreground">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            {creating ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Assessment" : "Create & Publish Assessment")}
          </Button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold text-foreground">Assessments</h3>
          <p className="text-sm text-muted-foreground">{assessments.length} assessments created</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-gradient-primary border-0 text-primary-foreground">
          <Plus className="h-4 w-4" /> Create Assessment
        </Button>
      </div>

      {loadingAssessments ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : assessments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No assessments created yet</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Create Your First Assessment
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map(a => {
            const mod = adminModules.find(m => m.id === a.module_id);
            const mix = a.question_mix || { mcq: 0, descriptive: 0, video: 0, coding: 0 };
            return (
              <div key={a.id} className="bg-card border border-border rounded-lg p-5 shadow-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "published" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {a.status}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteAssessment(a.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
                <h4 className="font-display font-semibold text-card-foreground mb-1">{a.title}</h4>
                {mod && <p className="text-xs text-muted-foreground mb-2">{mod.title}</p>}
                <div className="text-xs text-muted-foreground space-y-1 mb-3">
                  <p>{a.question_count} questions · Pass: {a.passing_score}%</p>
                  {(mix.mcq || mix.descriptive || mix.video || mix.coding) > 0 && (
                    <p className="text-[11px]">
                      {mix.mcq ? `${mix.mcq} MCQ ` : ""}
                      {mix.descriptive ? `· ${mix.descriptive} Desc ` : ""}
                      {mix.video ? `· ${mix.video} Video ` : ""}
                      {mix.coding ? `· ${mix.coding} Code ` : ""}
                    </p>
                  )}
                  {a.time_limit_minutes && <p>⏱️ {a.time_limit_minutes} min</p>}
                  {a.max_attempts && <p>🔄 Max {a.max_attempts} attempts</p>}
                  {(a.start_at || a.end_at) && (
                    <p>📅 {a.start_at ? new Date(a.start_at).toLocaleDateString() : "—"} → {a.end_at ? new Date(a.end_at).toLocaleDateString() : "—"}</p>
                  )}
                  {a.assigned_colleges.length > 0 && <p>🏫 {a.assigned_colleges.length} institute(s)</p>}
                  {a.proctoring_enabled && <p className="text-primary font-medium">🛡️ Proctored</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => handleEdit(a)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleToggleStatus(a.id, a.status)}>
                    {a.status === "published" ? "Unpublish" : "Publish"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssessmentCreator;
