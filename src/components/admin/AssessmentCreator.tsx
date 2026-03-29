import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Plus, Trash2, Loader2, Upload, Database, ClipboardCheck,
  Eye, Search, ArrowRight, Check
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminModules } from "@/hooks/useAdminModules";
import {
  useAssessments,
  useAssessmentQuestions,
  createAssessment,
  type AssessmentQuestion,
} from "@/hooks/useAssessments";

interface QuestionDraft {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  source: string;
}

const emptyQuestion = (): QuestionDraft => ({
  question: "",
  options: ["", "", "", ""],
  correct: 0,
  explanation: "",
  source: "manual",
});

const AssessmentCreator = () => {
  const { adminModules } = useAdminModules();
  const { assessments, loading: loadingAssessments, refetch } = useAssessments();
  const [creating, setCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState<string>("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<string>("");
  const [maxAttempts, setMaxAttempts] = useState<string>("");
  const [passingScore, setPassingScore] = useState("60");
  const [assignedColleges, setAssignedColleges] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [showForm, setShowForm] = useState(false);

  // AI generation
  const [generating, setGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState("10");

  // Question bank import
  const [bankQuestions, setBankQuestions] = useState<QuestionDraft[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [bankModuleFilter, setBankModuleFilter] = useState<string>("all");
  const [selectedBankIds, setSelectedBankIds] = useState<Set<number>>(new Set());

  // Colleges list
  const [colleges, setColleges] = useState<string[]>([]);
  useState(() => {
    supabase.from("colleges").select("name").then(({ data }) => {
      if (data) setColleges(data.map((c: any) => c.name));
    });
  });

  const addQuestion = () => setQuestions([...questions, emptyQuestion()]);

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: keyof QuestionDraft, value: any) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(questions.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[oIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) { toast.error("Enter a topic for AI generation"); return; }
    setGenerating(true);
    try {
      const modName = moduleId ? adminModules.find(m => m.id === Number(moduleId))?.title || "" : aiTopic;
      const { data, error } = await supabase.functions.invoke("generate-video-quiz", {
        body: { videoTitle: aiTopic, moduleName: modName, questionCount: Number(aiCount) || 10 },
      });
      if (error || !data?.questions) throw new Error("Failed");
      const aiQs: QuestionDraft[] = data.questions.map((q: any) => ({
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation || "",
        source: "ai",
      }));
      setQuestions(prev => [...prev.filter(q => q.question.trim()), ...aiQs]);
      toast.success(`Generated ${aiQs.length} AI questions!`);
    } catch {
      toast.error("AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const loadQuestionBank = async () => {
    setLoadingBank(true);
    let query = supabase.from("quiz_question_bank").select("*").order("created_at", { ascending: false });
    if (bankModuleFilter !== "all") {
      query = query.eq("module_id", Number(bankModuleFilter));
    }
    const { data } = await query;
    setBankQuestions((data || []).map((q: any) => ({
      question: q.question,
      options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
      correct: q.correct,
      explanation: q.explanation,
      source: "bank",
    })));
    setSelectedBankIds(new Set());
    setLoadingBank(false);
  };

  const importSelectedFromBank = () => {
    const selected = Array.from(selectedBankIds).map(i => bankQuestions[i]);
    setQuestions(prev => [...prev.filter(q => q.question.trim()), ...selected]);
    toast.success(`Imported ${selected.length} questions from bank`);
    setBankQuestions([]);
    setSelectedBankIds(new Set());
  };

  const toggleCollege = (college: string) => {
    setAssignedColleges(prev =>
      prev.includes(college) ? prev.filter(c => c !== college) : [...prev, college]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Enter assessment title"); return; }
    const validQs = questions.filter(q => q.question.trim() && q.options.every(o => o.trim()));
    if (validQs.length === 0) { toast.error("Add at least one complete question"); return; }

    setCreating(true);
    const creatorName = sessionStorage.getItem("trainerName") || sessionStorage.getItem("adminEmail") || "Admin";
    const creatorRole = sessionStorage.getItem("trainerName") ? "trainer" : "admin";

    await createAssessment({
      title: title.trim(),
      description: description.trim(),
      module_id: moduleId ? Number(moduleId) : null,
      created_by: creatorRole,
      created_by_name: creatorName,
      assigned_colleges: assignedColleges,
      time_limit_minutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
      max_attempts: maxAttempts ? Number(maxAttempts) : null,
      passing_score: Number(passingScore) || 60,
      questions: validQs.map((q, i) => ({ ...q, sort_order: i })),
    });

    // Reset form
    setTitle("");
    setDescription("");
    setModuleId("");
    setTimeLimitMinutes("");
    setMaxAttempts("");
    setPassingScore("60");
    setAssignedColleges([]);
    setQuestions([emptyQuestion()]);
    setShowForm(false);
    setCreating(false);
    refetch();
  };

  const handleDeleteAssessment = async (id: string) => {
    const { error } = await supabase.from("assessments").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Assessment deleted");
    refetch();
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("assessments")
      .update({ status: newStatus } as any)
      .eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    toast.success(`Assessment ${newStatus}`);
    refetch();
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-bold text-foreground">Create Assessment</h3>
          <Button variant="ghost" onClick={() => setShowForm(false)}>← Back to List</Button>
        </div>

        {/* Basic info */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Assessment Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Module 1 Final Assessment" />
              </div>
              <div>
                <Label>Module</Label>
                <Select value={moduleId} onValueChange={setModuleId}>
                  <SelectTrigger><SelectValue placeholder="Select module (optional)" /></SelectTrigger>
                  <SelectContent>
                    {adminModules.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Assessment description..." rows={2} />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Time Limit (minutes)</Label>
                <Input type="number" value={timeLimitMinutes} onChange={e => setTimeLimitMinutes(e.target.value)} placeholder="No limit" />
              </div>
              <div>
                <Label>Max Attempts</Label>
                <Input type="number" value={maxAttempts} onChange={e => setMaxAttempts(e.target.value)} placeholder="Unlimited" />
              </div>
              <div>
                <Label>Passing Score (%)</Label>
                <Input type="number" value={passingScore} onChange={e => setPassingScore(e.target.value)} placeholder="60" />
              </div>
            </div>

            {/* College assignment */}
            {colleges.length > 0 && (
              <div>
                <Label>Assign to Colleges</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {colleges.map(c => (
                    <label key={c} className="flex items-center gap-1.5 text-xs bg-muted px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-muted/80">
                      <Checkbox checked={assignedColleges.includes(c)} onCheckedChange={() => toggleCollege(c)} />
                      {c}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {assignedColleges.length === 0 ? "No colleges selected = visible to all students" : `Assigned to ${assignedColleges.length} college(s)`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question sources */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Add Questions</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="manual">
              <TabsList className="mb-4">
                <TabsTrigger value="manual" className="gap-1 text-xs"><Plus className="h-3 w-3" /> Manual</TabsTrigger>
                <TabsTrigger value="ai" className="gap-1 text-xs"><Sparkles className="h-3 w-3" /> AI Generate</TabsTrigger>
                <TabsTrigger value="bank" className="gap-1 text-xs"><Database className="h-3 w-3" /> Question Bank</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                {questions.map((q, qi) => (
                  <div key={qi} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-muted-foreground">Q{qi + 1}</span>
                      {questions.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeQuestion(qi)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Question text..."
                      value={q.question}
                      onChange={e => updateQuestion(qi, "question", e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qi}`}
                            checked={q.correct === oi}
                            onChange={() => updateQuestion(qi, "correct", oi)}
                            className="accent-primary"
                          />
                          <Input
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            value={opt}
                            onChange={e => updateOption(qi, oi, e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                    <Input
                      placeholder="Explanation (shown after answering)"
                      value={q.explanation}
                      onChange={e => updateQuestion(qi, "explanation", e.target.value)}
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addQuestion} className="gap-1">
                  <Plus className="h-3 w-3" /> Add Question
                </Button>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Topic</Label>
                    <Input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="e.g., Machine Learning Basics" />
                  </div>
                  <div>
                    <Label>Number of Questions</Label>
                    <Input type="number" value={aiCount} onChange={e => setAiCount(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleAIGenerate} disabled={generating} className="gap-2 bg-gradient-accent border-0">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generating ? "Generating..." : "Generate with AI"}
                </Button>
              </TabsContent>

              <TabsContent value="bank" className="space-y-4">
                <div className="flex items-center gap-3">
                  <Select value={bankModuleFilter} onValueChange={setBankModuleFilter}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Filter by module" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modules</SelectItem>
                      {adminModules.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {bankQuestions.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {bankQuestions.map((q, i) => (
                      <label key={i} className="flex items-start gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30">
                        <Checkbox
                          checked={selectedBankIds.has(i)}
                          onCheckedChange={() => {
                            setSelectedBankIds(prev => {
                              const next = new Set(prev);
                              next.has(i) ? next.delete(i) : next.add(i);
                              return next;
                            });
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{q.question}</p>
                          <p className="text-xs text-muted-foreground">
                            {q.options.map((o, oi) => `${String.fromCharCode(65 + oi)}) ${o}`).join(" · ")}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Summary and create */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <p className="text-sm">
            <strong>{questions.filter(q => q.question.trim()).length}</strong> questions ready
          </p>
          <Button onClick={handleCreate} disabled={creating} className="gap-2 bg-gradient-primary border-0 text-primary-foreground">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            {creating ? "Creating..." : "Create & Publish Assessment"}
          </Button>
        </div>
      </div>
    );
  }

  // List view
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
                  {a.time_limit_minutes && <p>⏱️ {a.time_limit_minutes} min</p>}
                  {a.max_attempts && <p>🔄 Max {a.max_attempts} attempts</p>}
                  {a.assigned_colleges.length > 0 && (
                    <p>🏫 {a.assigned_colleges.join(", ")}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleToggleStatus(a.id, a.status)}
                  >
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
