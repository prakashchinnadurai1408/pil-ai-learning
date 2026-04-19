import { useState, useEffect, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  Code2, Sparkles, Loader2, Trash2, Plus, RefreshCw
} from "lucide-react";

interface DbChallenge {
  id: string;
  title: string;
  difficulty: string;
  category: string;
  description: string;
  sample_input: string | null;
  sample_output: string | null;
  source: string;
  created_at: string;
}

const categories = ["Basics", "Loops", "Arrays", "Strings", "Recursion", "Math", "Data Structures"];
const difficulties = ["Easy", "Medium", "Hard", "Mixed"];

const CodingChallengeManager = () => {
  const [challenges, setChallenges] = useState<DbChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genCategory, setGenCategory] = useState("Mixed");
  const [genDifficulty, setGenDifficulty] = useState("Mixed");
  const [genCount, setGenCount] = useState(5);

  // Manual add state
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualCategory, setManualCategory] = useState("Basics");
  const [manualDifficulty, setManualDifficulty] = useState("Easy");
  const [manualInput, setManualInput] = useState("");
  const [manualOutput, setManualOutput] = useState("");

  useEffect(() => { fetchChallenges(); }, []);

  async function fetchChallenges() {
    setLoading(true);
    const { data } = await supabase
      .from("coding_challenges")
      .select("*")
      .order("created_at", { ascending: false });
    setChallenges((data as DbChallenge[]) || []);
    setLoading(false);
  }

  async function generateChallenges() {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-coding-challenges", {
        body: { category: genCategory, difficulty: genDifficulty, count: genCount },
      });
      if (error) throw error;
      toast({ title: "Challenges Generated! ✨", description: `${data.count} new challenges added.` });
      fetchChallenges();
    } catch (err: any) {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  async function addManual() {
    if (!manualTitle || !manualDesc) {
      toast({ title: "Missing fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("coding_challenges").insert({
      title: manualTitle,
      description: manualDesc,
      category: manualCategory,
      difficulty: manualDifficulty,
      sample_input: manualInput || null,
      sample_output: manualOutput || null,
      source: "manual",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Challenge Added!" });
      setManualTitle(""); setManualDesc(""); setManualInput(""); setManualOutput("");
      setShowManual(false);
      fetchChallenges();
    }
  }

  async function deleteChallenge(id: string) {
    await supabase.from("coding_challenges").delete().eq("id", id);
    setChallenges(prev => prev.filter(c => c.id !== id));
    toast({ title: "Challenge deleted" });
  }

  const difficultyColor: Record<string, string> = {
    Easy: "bg-success/10 text-success border-success/20",
    Medium: "bg-warning/10 text-warning border-warning/20",
    Hard: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="space-y-6">
      {/* AI Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Challenge Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={genCategory} onValueChange={setGenCategory}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mixed">Mixed</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
              <Select value={genDifficulty} onValueChange={setGenDifficulty}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Count</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={genCount}
                onChange={e => setGenCount(Number(e.target.value))}
                className="w-[80px]"
              />
            </div>
            <Button onClick={generateChallenges} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Generating..." : "Generate Challenges"}
            </Button>
            <Button variant="outline" onClick={() => setShowManual(!showManual)} className="gap-2">
              <Plus className="h-4 w-4" /> Manual Add
            </Button>
          </div>

          {/* Manual Entry Form */}
          {showManual && (
            <div className="mt-4 p-4 border border-border rounded-lg space-y-3 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input placeholder="Challenge Title" value={manualTitle} onChange={e => setManualTitle(e.target.value)} />
                <div className="flex gap-2">
                  <Select value={manualCategory} onValueChange={setManualCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={manualDifficulty} onValueChange={setManualDifficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Easy", "Medium", "Hard"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea placeholder="Problem description..." value={manualDesc} onChange={e => setManualDesc(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Sample Input" value={manualInput} onChange={e => setManualInput(e.target.value)} />
                <Input placeholder="Expected Output" value={manualOutput} onChange={e => setManualOutput(e.target.value)} />
              </div>
              <Button onClick={addManual} size="sm">Add Challenge</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Challenge List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Code2 className="h-5 w-5 text-primary" />
              Coding Challenges ({challenges.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchChallenges} className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading challenges...</div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Code2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No AI-generated challenges yet. Use the generator above!</p>
            </div>
          ) : (
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2">
                {challenges.map(c => (
                  <div key={c.id} className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-card-foreground truncate">{c.title}</h4>
                        <Badge variant="outline" className={difficultyColor[c.difficulty] || ""}>{c.difficulty}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{c.category}</Badge>
                        <Badge variant="outline" className="text-[10px]">{c.source}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                      {(c.sample_input || c.sample_output) && (
                        <div className="flex gap-4 mt-1 text-[10px] font-mono text-muted-foreground">
                          {c.sample_input && <span>Input: {c.sample_input}</span>}
                          {c.sample_output && <span>Output: {c.sample_output}</span>}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={() => deleteChallenge(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CodingChallengeManager;
