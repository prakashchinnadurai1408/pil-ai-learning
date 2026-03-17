import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  programmingChallenges,
  supportedLanguages,
  challengeCategories,
  type ProgrammingChallenge,
} from "@/data/programmingChallenges";
import {
  Play, ChevronLeft, Search, Code2, Terminal,
  Loader2, CheckCircle, XCircle, Clock, Trophy
} from "lucide-react";
import CodingLeaderboard from "./CodingLeaderboard";

const PISTON_API = "https://emkc.org/api/v2/piston/execute";

const difficultyColor: Record<string, string> = {
  Easy: "bg-success/10 text-success border-success/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  Hard: "bg-destructive/10 text-destructive border-destructive/20",
};

const ProgrammingModule = () => {
  const [selectedChallenge, setSelectedChallenge] = useState<ProgrammingChallenge | null>(null);
  const [selectedLang, setSelectedLang] = useState("python3");
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [solvedIds, setSolvedIds] = useState<Set<number>>(new Set());
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const studentName = sessionStorage.getItem("studentName") || "";

  useEffect(() => {
    if (!studentName) return;
    supabase
      .from("student_solved_challenges")
      .select("challenge_id")
      .eq("student_name", studentName)
      .then(({ data }) => {
        if (data) setSolvedIds(new Set(data.map((d: any) => d.challenge_id)));
      });
  }, [studentName]);

  const markSolved = useCallback(async (challengeId: number, lang: string) => {
    if (!studentName || solvedIds.has(challengeId)) return;
    const { error } = await supabase
      .from("student_solved_challenges")
      .upsert({ student_name: studentName, challenge_id: challengeId, language: lang }, { onConflict: "student_name,challenge_id" });
    if (!error) {
      setSolvedIds(prev => new Set(prev).add(challengeId));
      toast({ title: "Challenge Solved! 🎉", description: "Added to your leaderboard score." });
    }
  }, [studentName, solvedIds]);

  const filteredChallenges = useMemo(() => {
    return programmingChallenges.filter((c) => {
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "All" || c.category === categoryFilter;
      const matchesDifficulty = difficultyFilter === "All" || c.difficulty === difficultyFilter;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [searchQuery, categoryFilter, difficultyFilter]);

  const selectChallenge = useCallback((challenge: ProgrammingChallenge) => {
    setSelectedChallenge(challenge);
    const lang = supportedLanguages.find((l) => l.id === selectedLang);
    setCode(lang?.template || "");
    setStdin(challenge.sampleInput || "");
    setOutput("");
  }, [selectedLang]);

  const changeLang = useCallback((langId: string) => {
    setSelectedLang(langId);
    const lang = supportedLanguages.find((l) => l.id === langId);
    setCode(lang?.template || "");
    setOutput("");
  }, []);

  const runCode = useCallback(async () => {
    setIsRunning(true);
    setOutput("");
    const lang = supportedLanguages.find((l) => l.id === selectedLang);
    if (!lang) return;

    try {
      const res = await fetch(PISTON_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lang.id === "cpp" ? "c++" : lang.id === "python3" ? "python" : lang.id,
          version: lang.version,
          files: [{ content: code }],
          stdin,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      if (data.run) {
        const result = data.run.stderr
          ? `ERROR:\n${data.run.stderr}`
          : data.run.output || "(No output)";
        setOutput(result);
      } else {
        setOutput("Unexpected response from compiler.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setOutput(`Failed to execute: ${msg}`);
      toast({ title: "Execution Failed", description: msg, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  }, [selectedLang, code, stdin]);

  // === CHALLENGE LIST VIEW ===
  if (!selectedChallenge) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search challenges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {challengeCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              {["All", "Easy", "Medium", "Hard"].map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Code2 className="h-4 w-4" />
            <span>{filteredChallenges.length} challenges found · {solvedIds.size} solved</span>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowLeaderboard(!showLeaderboard)}>
            <Trophy className="h-4 w-4" />
            {showLeaderboard ? "Hide Leaderboard" : "Leaderboard"}
          </Button>
        </div>

        <div className={`grid gap-4 ${showLeaderboard ? "grid-cols-1 lg:grid-cols-3" : ""}`}>
          <ScrollArea className={`h-[60vh] ${showLeaderboard ? "lg:col-span-2" : ""}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredChallenges.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectChallenge(c)}
                  className={`text-left bg-card border rounded-lg p-4 hover:shadow-elevated hover:border-primary/30 transition-all group ${
                    solvedIds.has(c.id) ? "border-success/30 bg-success/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-muted-foreground">#{c.id}</span>
                      {solvedIds.has(c.id) && <CheckCircle className="h-3.5 w-3.5 text-success" />}
                    </div>
                    <Badge variant="outline" className={difficultyColor[c.difficulty]}>
                      {c.difficulty}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm text-card-foreground group-hover:text-primary transition-colors mb-1">
                    {c.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-[10px]">{c.category}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
          {showLeaderboard && (
            <div className="lg:col-span-1">
              <CodingLeaderboard />
            </div>
          )}
        </div>
      </div>
    );
  }

  // === CODE EDITOR VIEW ===
  const expectedOutput = selectedChallenge.sampleOutput?.trim();
  const actualOutput = output.trim();
  const hasOutput = output.length > 0;
  const isCorrect = hasOutput && !output.startsWith("ERROR") && !output.startsWith("Failed") && actualOutput === expectedOutput;

  // Auto-save when correct
  useEffect(() => {
    if (isCorrect && selectedChallenge) {
      markSolved(selectedChallenge.id, selectedLang);
    }
  }, [isCorrect, selectedChallenge, selectedLang, markSolved]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedChallenge(null); setOutput(""); }}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">#{selectedChallenge.id}</span>
            <h3 className="font-display font-bold text-card-foreground">{selectedChallenge.title}</h3>
            <Badge variant="outline" className={difficultyColor[selectedChallenge.difficulty]}>
              {selectedChallenge.difficulty}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">{selectedChallenge.category}</Badge>
          </div>
        </div>
      </div>

      {/* Problem Statement */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-card-foreground">{selectedChallenge.description}</p>
        {selectedChallenge.sampleInput && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Sample Input</p>
              <pre className="text-xs bg-muted rounded p-2 font-mono text-foreground">{selectedChallenge.sampleInput}</pre>
            </div>
            {selectedChallenge.sampleOutput && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Expected Output</p>
                <pre className="text-xs bg-muted rounded p-2 font-mono text-foreground">{selectedChallenge.sampleOutput}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Language Selector + Run */}
      <div className="flex items-center gap-3">
        <Select value={selectedLang} onValueChange={changeLang}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {supportedLanguages.map((lang) => (
              <SelectItem key={lang.id} value={lang.id}>
                {lang.label} ({lang.version})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={runCode} disabled={isRunning || !code.trim()} className="gap-2">
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {isRunning ? "Running..." : "Run Code"}
        </Button>
        {hasOutput && (
          <div className="flex items-center gap-1 text-sm">
            {isCorrect ? (
              <><CheckCircle className="h-4 w-4 text-success" /><span className="text-success font-medium">Correct!</span></>
            ) : output.startsWith("ERROR") ? (
              <><XCircle className="h-4 w-4 text-destructive" /><span className="text-destructive font-medium">Error</span></>
            ) : (
              <><Clock className="h-4 w-4 text-warning" /><span className="text-warning font-medium">Check output</span></>
            )}
          </div>
        )}
      </div>

      {/* Code Editor + Input */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Code Editor</label>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono text-sm min-h-[300px] bg-muted/50 resize-y"
            placeholder="Write your code here..."
            spellCheck={false}
          />
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Input (stdin)</label>
            <Textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              className="font-mono text-sm min-h-[100px] bg-muted/50 mt-1"
              placeholder="Enter input here..."
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-xs font-semibold text-muted-foreground">Output</label>
            </div>
            <pre className={`font-mono text-sm min-h-[160px] p-3 rounded-md border whitespace-pre-wrap ${
              hasOutput && isCorrect
                ? "bg-success/5 border-success/20 text-success"
                : output.startsWith("ERROR")
                ? "bg-destructive/5 border-destructive/20 text-destructive"
                : "bg-muted border-border text-foreground"
            }`}>
              {output || "Output will appear here..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgrammingModule;
