import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminModules } from "@/hooks/useAdminModules";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, Database, Layers, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onGenerated?: () => void;
}

const AIQuestionBankGenerator = ({ onGenerated }: Props) => {
  const { adminModules, loading: modulesLoading } = useAdminModules();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [count, setCount] = useState(20);
  const [difficulty, setDifficulty] = useState("mixed");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [results, setResults] = useState<{ moduleName: string; inserted: number; skipped: number; error?: string }[]>([]);

  const publishedModules = useMemo(
    () => adminModules.filter((m) => m.status === "published"),
    [adminModules]
  );

  const toggleModule = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === publishedModules.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(publishedModules.map((m) => m.id)));
    }
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one module");
      return;
    }
    setGenerating(true);
    setResults([]);
    const targets = publishedModules.filter((m) => selectedIds.has(m.id));
    const batchResults: typeof results = [];

    for (let i = 0; i < targets.length; i++) {
      const m = targets[i];
      setProgress({ done: i, total: targets.length, current: m.title });
      try {
        const { data, error } = await supabase.functions.invoke("generate-question-bank", {
          body: { moduleId: m.id, moduleName: m.title, count, difficulty },
        });
        if (error || data?.error) {
          batchResults.push({ moduleName: m.title, inserted: 0, skipped: 0, error: data?.error || error?.message });
        } else {
          batchResults.push({
            moduleName: m.title,
            inserted: data?.inserted || 0,
            skipped: data?.duplicatesSkipped || 0,
          });
        }
      } catch (e: any) {
        batchResults.push({ moduleName: m.title, inserted: 0, skipped: 0, error: e?.message || "Failed" });
      }
      setResults([...batchResults]);
    }

    setProgress(null);
    setGenerating(false);
    const totalInserted = batchResults.reduce((s, r) => s + r.inserted, 0);
    toast.success(`Generated ${totalInserted} new question(s) across ${targets.length} module(s)`);
    onGenerated?.();
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary flex-shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-card-foreground">Bulk AI Question Bank Generator</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Pick one or more modules and generate a fresh batch of MCQs per module. Duplicates are
              auto-detected and skipped.
            </p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Questions per module</Label>
          <Input
            type="number"
            min={5}
            max={50}
            value={count}
            onChange={(e) => setCount(Math.max(5, Math.min(50, Number(e.target.value) || 20)))}
            disabled={generating}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty} disabled={generating}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mixed">Mixed (recommended)</SelectItem>
              <SelectItem value="easy">Easy only</SelectItem>
              <SelectItem value="medium">Medium only</SelectItem>
              <SelectItem value="hard">Hard only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Module picker */}
      <div className="bg-card rounded-lg border border-border shadow-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Select Modules ({selectedIds.size}/{publishedModules.length})</span>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleAll} disabled={generating || publishedModules.length === 0}>
            {selectedIds.size === publishedModules.length ? "Clear" : "Select all"}
          </Button>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-border">
          {modulesLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading modules…</div>
          ) : publishedModules.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No published modules found.</div>
          ) : (
            publishedModules.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.has(m.id)}
                  onCheckedChange={() => toggleModule(m.id)}
                  disabled={generating}
                />
                <span className="text-sm text-card-foreground flex-1">{m.title}</span>
                <Badge variant="outline" className="text-[10px]">M{m.id}</Badge>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={generating || selectedIds.size === 0}
        className="w-full gap-2"
        size="lg"
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {generating
          ? `Generating… (${progress?.done || 0}/${progress?.total || 0})`
          : `Generate ${count} questions × ${selectedIds.size} module(s)`}
      </Button>

      {progress && (
        <div className="text-xs text-muted-foreground text-center">
          Currently generating for: <span className="font-medium text-card-foreground">{progress.current}</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-card rounded-lg border border-border shadow-card">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Results</span>
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                {r.error ? (
                  <Badge variant="destructive" className="text-[10px]">Failed</Badge>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                )}
                <span className="flex-1 text-card-foreground">{r.moduleName}</span>
                {r.error ? (
                  <span className="text-xs text-destructive">{r.error}</span>
                ) : (
                  <>
                    <Badge variant="secondary" className="text-[10px]">+{r.inserted} new</Badge>
                    {r.skipped > 0 && (
                      <Badge variant="outline" className="text-[10px]">{r.skipped} dup</Badge>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIQuestionBankGenerator;
