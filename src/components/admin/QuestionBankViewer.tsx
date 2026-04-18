import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Database, Trash2, Filter, HelpCircle, CheckSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import AIQuestionBankGenerator from "./AIQuestionBankGenerator";

interface BankQuestion {
  id: string;
  module_id: number;
  module_name: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  source: string;
  created_at: string;
}

const QuestionBankViewer = () => {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quiz_question_bank")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setQuestions(
        data.map((row: any) => ({
          ...row,
          options: Array.isArray(row.options) ? row.options : JSON.parse(row.options),
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchQuestions(); }, []);

  const moduleList = useMemo(() => {
    const map = new Map<number, string>();
    questions.forEach((q) => map.set(q.module_id, q.module_name));
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [questions]);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (filterModule !== "all" && q.module_id !== Number(filterModule)) return false;
      if (search) {
        const s = search.toLowerCase();
        return q.question.toLowerCase().includes(s) || q.explanation.toLowerCase().includes(s);
      }
      return true;
    });
  }, [questions, search, filterModule]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("quiz_question_bank").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete question");
    } else {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Question deleted");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const filteredIds = filtered.map((q) => q.id);
    const allSelected = filteredIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIds));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("quiz_question_bank").delete().in("id", ids);
    if (error) {
      toast.error("Failed to delete questions");
    } else {
      setQuestions((prev) => prev.filter((q) => !selectedIds.has(q.id)));
      toast.success(`${ids.length} question(s) deleted`);
      setSelectedIds(new Set());
    }
    setShowBulkConfirm(false);
  };

  const stats = useMemo(() => {
    const byModule = new Map<string, number>();
    questions.forEach((q) => {
      byModule.set(q.module_name, (byModule.get(q.module_name) || 0) + 1);
    });
    return { total: questions.length, modules: byModule.size, byModule };
  }, [questions]);

  return (
    <Tabs defaultValue="browse" className="space-y-6">
      <TabsList>
        <TabsTrigger value="browse" className="gap-2"><Database className="h-4 w-4" /> Browse Bank</TabsTrigger>
        <TabsTrigger value="generate" className="gap-2"><Sparkles className="h-4 w-4" /> AI Generate</TabsTrigger>
      </TabsList>

      <TabsContent value="generate">
        <AIQuestionBankGenerator onGenerated={fetchQuestions} />
      </TabsContent>

      <TabsContent value="browse" className="space-y-6">
      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-5 shadow-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-display font-bold text-card-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Questions</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-5 shadow-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-display font-bold text-card-foreground">{stats.modules}</p>
            <p className="text-xs text-muted-foreground">Modules Covered</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-5 shadow-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-display font-bold text-card-foreground">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Showing</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {moduleList.map(([id, name]) => (
              <SelectItem key={id} value={String(id)}>
                Module {id}: {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
          <CheckSquare className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-card-foreground">{selectedIds.size} selected</span>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 ml-auto"
            onClick={() => setShowBulkConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Questions list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Database className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No questions in the bank yet</p>
          <p className="text-xs mt-1">AI-generated questions will appear here after students retake quizzes.</p>
        </div>
      ) : (
        <>
          {/* Select all */}
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={filtered.length > 0 && filtered.every((q) => selectedIds.has(q.id))}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs text-muted-foreground">Select all ({filtered.length})</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filtered.map((q) => (
              <div key={q.id} className={`bg-card rounded-lg border p-4 shadow-card transition-colors ${selectedIds.has(q.id) ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
                <div className="flex items-start gap-3 mb-2">
                  <Checkbox
                    checked={selectedIds.has(q.id)}
                    onCheckedChange={() => toggleSelect(q.id)}
                    className="mt-0.5"
                  />
                  <p className="font-medium text-sm text-card-foreground flex-1">{q.question}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => handleDelete(q.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-2 ml-7">
                  {q.options.map((opt, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-1 rounded border ${
                        i === q.correct
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap ml-7">
                  <Badge variant="secondary" className="text-xs">
                    Module {q.module_id}: {q.module_name}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {q.source}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(q.created_at).toLocaleDateString()}
                  </span>
                </div>
                {q.explanation && (
                  <p className="text-xs text-muted-foreground mt-2 italic ml-7">💡 {q.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bulk delete confirmation */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} question(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the selected questions from the question bank. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuestionBankViewer;
