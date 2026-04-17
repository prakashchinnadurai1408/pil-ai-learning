import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { streamChat } from "@/lib/streamChat";
import ReactMarkdown from "react-markdown";
import {
  MessageSquare, Send, Loader2, BookOpen, Target,
  Lightbulb, ChevronRight, RotateCcw, Sparkles, GraduationCap,
  FileText, Code2, Pencil, Search, BarChart3, Award, CheckCircle2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// --- Lesson Data ---
const lessons = [
  {
    id: 1,
    title: "What is Prompt Engineering?",
    icon: BookOpen,
    difficulty: "Beginner",
    content: `**Prompt Engineering** is the art and science of crafting instructions for AI models to get the best possible output.\n\n### Why It Matters\n- AI models respond differently based on how you phrase your request\n- A well-crafted prompt can save hours of work\n- It's the #1 skill for using AI effectively in academics\n\n### Key Concepts\n1. **Clarity** – Be specific about what you want\n2. **Context** – Provide background information\n3. **Constraints** – Set boundaries (length, format, style)\n4. **Examples** – Show the AI what good output looks like`,
  },
  {
    id: 2,
    title: "Types of Prompts",
    icon: Target,
    difficulty: "Beginner",
    content: `### Zero-Shot Prompting\nAsk directly without examples:\n> "Explain photosynthesis in simple terms"\n\n### Few-Shot Prompting\nProvide examples first:\n> "Translate: Hello → Bonjour, Goodbye → Au revoir, Thank you → ?"\n\n### Chain-of-Thought (CoT)\nAsk the AI to reason step-by-step:\n> "Solve this math problem step by step: If a train travels..."\n\n### Role-Based Prompting\nAssign a persona:\n> "You are a senior software engineer. Review this code..."\n\n### Instruction-Based\nGive explicit instructions:\n> "Summarize the following article in exactly 3 bullet points. Use formal language."`,
  },
  {
    id: 3,
    title: "Prompt Frameworks",
    icon: Lightbulb,
    difficulty: "Intermediate",
    content: `### CRISP Framework\n- **C**ontext: Background info\n- **R**ole: Who should the AI be?\n- **I**nstructions: What to do\n- **S**tyle: Tone and format\n- **P**arameters: Constraints\n\n### RACE Framework\n- **R**ole: Define the AI's expertise\n- **A**ction: What action to take\n- **C**ontext: Relevant background\n- **E**xpectation: Desired output format\n\n### APE (Action, Purpose, Expectation)\n> Action: "Generate a literature review"\n> Purpose: "for my thesis on renewable energy"\n> Expectation: "in APA format with 10 recent citations"`,
  },
  {
    id: 4,
    title: "Academic Writing with AI",
    icon: FileText,
    difficulty: "Intermediate",
    content: `### Research Paper Assistance\n\`\`\`\nYou are an academic writing assistant specializing in [field].\nHelp me write a [section] for my paper on [topic].\nUse formal academic tone, cite relevant concepts,\nand follow [APA/IEEE] formatting guidelines.\n\`\`\`\n\n### Thesis Outline Generation\n\`\`\`\nCreate a detailed thesis outline for: [topic]\nInclude: Introduction, Literature Review,\nMethodology, Results, Discussion, Conclusion.\nFor each section, provide 3-4 sub-points.\n\`\`\`\n\n### Literature Review Summarization\n\`\`\`\nSummarize the key findings from these papers\non [topic]. Identify common themes, gaps\nin research, and potential areas for future study.\n\`\`\``,
  },
  {
    id: 5,
    title: "Coding with AI Prompts",
    icon: Code2,
    difficulty: "Intermediate",
    content: `### Code Generation\n\`\`\`\nWrite a Python function that:\n- Takes a list of candidate grades as input\n- Calculates mean, median, and mode\n- Returns a dictionary with these statistics\n- Include error handling for empty lists\n- Add docstring and type hints\n\`\`\`\n\n### Code Review\n\`\`\`\nReview this code for:\n1. Bug identification\n2. Performance improvements\n3. Security vulnerabilities\n4. Code style (PEP 8)\nProvide specific line-by-line feedback.\n\`\`\`\n\n### Debugging\n\`\`\`\nI'm getting [error message] when running [code].\nExplain why this error occurs and provide\na corrected version with explanation.\n\`\`\``,
  },
  {
    id: 6,
    title: "Data Analysis Prompts",
    icon: BarChart3,
    difficulty: "Intermediate",
    content: `### Statistical Analysis\n\`\`\`\nAnalyze this dataset:\n[paste data or describe it]\n\nPerform:\n1. Descriptive statistics\n2. Identify trends and patterns\n3. Suggest appropriate statistical tests\n4. Interpret results in plain language\n\`\`\`\n\n### Survey Analysis\n\`\`\`\nI have survey responses from [N] participants.\nQuestions covered: [topics].\nAnalyze the data for:\n- Response distribution\n- Correlations between variables\n- Key insights and recommendations\n\`\`\``,
  },
  {
    id: 7,
    title: "Advanced Techniques",
    icon: Sparkles,
    difficulty: "Advanced",
    content: `### Meta-Prompting\nAsk AI to create prompts:\n> "Generate 5 different prompts I could use to get a comprehensive analysis of [topic]"\n\n### Iterative Refinement\n1. Start with a basic prompt\n2. Evaluate the output\n3. Add constraints or context\n4. Repeat until satisfied\n\n### Negative Prompting\nSpecify what NOT to include:\n> "Explain quantum computing WITHOUT using jargon, WITHOUT analogies, in exactly 200 words"\n\n### Template Variables\nCreate reusable prompt templates:\n> "As a {role} expert, explain {concept} to a {audience} using {format}"\n\n### Multi-Step Workflows\n1. Step 1: "Research [topic] and list 10 key points"\n2. Step 2: "Using these points, write an outline"\n3. Step 3: "Expand each section into paragraphs"`,
  },
  {
    id: 8,
    title: "Project-Specific Prompts",
    icon: GraduationCap,
    difficulty: "Advanced",
    content: `### Synopsis Writing\n\`\`\`\nGenerate a project synopsis for:\nTitle: [your project title]\nDomain: [CS/IT/ECE/Mechanical/etc.]\nInclude: Objective, Scope, Methodology,\nExpected Outcomes, References\nFormat: IEEE format, 2 pages max\n\`\`\`\n\n### SRS Document\n\`\`\`\nCreate a Software Requirements Specification for:\nProject: [name]\nModules: [list modules]\nInclude: Functional requirements,\nNon-functional requirements, Use cases,\nSystem architecture diagram description\n\`\`\`\n\n### Presentation Script\n\`\`\`\nCreate a 10-minute presentation script for\nmy project on [topic]. Structure:\n- Hook/Introduction (1 min)\n- Problem Statement (2 min)\n- Solution/Methodology (3 min)\n- Demo walkthrough (2 min)\n- Results & Future Work (2 min)\n\`\`\``,
  },
];

// --- Practice Challenges ---
const challenges = [
  {
    id: 1,
    title: "Write a Research Abstract",
    difficulty: "Beginner",
    task: "Craft a prompt that generates a 150-word abstract for a research paper on 'Impact of Social Media on Candidate Mental Health'. The abstract should include background, methodology, key findings, and conclusion.",
    hint: "Use the RACE framework: define a Role (academic researcher), Action (write abstract), Context (topic details), Expectation (word count and structure).",
  },
  {
    id: 2,
    title: "Debug Python Code",
    difficulty: "Beginner",
    task: "Write a prompt asking AI to find and fix bugs in a Python function that calculates fibonacci numbers but returns wrong results for n > 10.",
    hint: "Be specific about the error behavior. Include the actual vs expected output. Ask for explanation of each bug.",
  },
  {
    id: 3,
    title: "Literature Review Summary",
    difficulty: "Intermediate",
    task: "Create a prompt that asks AI to generate a structured literature review on 'Machine Learning in Healthcare' with at least 5 thematic categories and identification of research gaps.",
    hint: "Use few-shot prompting by showing an example category structure. Add constraints for academic tone and citation style.",
  },
  {
    id: 4,
    title: "Data Analysis Pipeline",
    difficulty: "Intermediate",
    task: "Design a multi-step prompt chain that: (1) cleans a messy CSV dataset, (2) performs exploratory analysis, (3) generates visualizations, and (4) writes insights summary.",
    hint: "Use chain-of-thought prompting. Break into 4 sequential prompts where each builds on the previous output.",
  },
  {
    id: 5,
    title: "Technical Architecture Document",
    difficulty: "Advanced",
    task: "Create a prompt that generates a complete system architecture document for an e-commerce platform including microservices, database schema, API endpoints, and deployment strategy.",
    hint: "Use role-based prompting (senior architect). Add constraints for specific technologies. Use meta-prompting to first outline, then expand each section.",
  },
  {
    id: 6,
    title: "Exam Question Generator",
    difficulty: "Advanced",
    task: "Design a prompt that creates a balanced exam paper with 5 MCQs, 3 short answers, and 2 essay questions on 'Operating Systems' covering process management, memory management, and file systems. Include answer key and marking scheme.",
    hint: "Specify Bloom's taxonomy levels for each question type. Use structured output format with clear sections.",
  },
];

const scoreColor = (score: number) =>
  score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
const scoreBg = (score: number) =>
  score >= 80 ? "bg-success/10" : score >= 50 ? "bg-warning/10" : "bg-destructive/10";

const PromptScoreCard = ({ evaluation }: { evaluation: { clarity: number; specificity: number; framework: number; overall: number; feedback: string } }) => (
  <div className="bg-card border border-border rounded-lg p-5 shadow-card">
    <div className="flex items-center gap-2 mb-4">
      <Award className="h-5 w-5 text-primary" />
      <span className="font-display font-bold text-card-foreground">Prompt Score</span>
      <div className={`ml-auto text-2xl font-display font-bold ${scoreColor(evaluation.overall)}`}>
        {evaluation.overall}/100
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3 mb-4">
      {([
        { label: "Clarity", value: evaluation.clarity, icon: CheckCircle2 },
        { label: "Specificity", value: evaluation.specificity, icon: Target },
        { label: "Framework", value: evaluation.framework, icon: Lightbulb },
      ] as const).map(({ label, value, icon: Icon }) => (
        <div key={label} className={`rounded-lg p-3 ${scoreBg(value)} text-center`}>
          <Icon className={`h-4 w-4 mx-auto mb-1 ${scoreColor(value)}`} />
          <div className={`text-lg font-bold ${scoreColor(value)}`}>{value}</div>
          <div className="text-[10px] text-muted-foreground font-medium">{label}</div>
          <Progress value={value} className="h-1 mt-1.5" />
        </div>
      ))}
    </div>
    <div className="bg-muted rounded-md p-3">
      <p className="text-xs font-semibold text-muted-foreground mb-1">AI Feedback</p>
      <p className="text-sm text-card-foreground">{evaluation.feedback}</p>
    </div>
  </div>
);

const PromptEngineeringLab = () => {
  const [activeTab, setActiveTab] = useState("learn");
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<number | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [sandboxPrompt, setSandboxPrompt] = useState("");
  const [sandboxResponse, setSandboxResponse] = useState("");
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxRole, setSandboxRole] = useState("general");
  const [evaluation, setEvaluation] = useState<{ clarity: number; specificity: number; framework: number; overall: number; feedback: string } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const runPrompt = useCallback(async (prompt: string, setter: React.Dispatch<React.SetStateAction<string>>, loadSetter: (v: boolean) => void, systemRole: string) => {
    if (!prompt.trim()) return;
    loadSetter(true);
    setter("");
    let accumulated = "";
    try {
      await streamChat({
        messages: [{ role: "user", content: prompt }],
        tool: systemRole === "general" ? undefined : systemRole,
        onDelta: (delta) => { accumulated += delta; setter(accumulated); },
        onDone: () => loadSetter(false),
      });
    } catch {
      toast({ title: "Error", description: "Failed to get AI response. Please try again.", variant: "destructive" });
      loadSetter(false);
    }
  }, []);

  const evaluatePrompt = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    setIsEvaluating(true);
    setEvaluation(null);
    try {
      const evalPrompt = `You are a prompt engineering evaluator. Score this student's prompt on 3 criteria (each 0-100):

PROMPT TO EVALUATE:
"""
${prompt}
"""

Score these criteria:
1. **Clarity** (0-100): Is the prompt clear, unambiguous, and easy to understand?
2. **Specificity** (0-100): Does it include specific details, constraints, format requirements, and context?
3. **Framework Usage** (0-100): Does it use prompt engineering techniques (role assignment, examples, chain-of-thought, structured output, constraints)?

Respond in EXACTLY this JSON format, nothing else:
{"clarity":85,"specificity":70,"framework":60,"feedback":"2-3 sentences of constructive feedback with specific improvement suggestions."}`;

      let fullText = "";
      await streamChat({
        messages: [{ role: "user", content: evalPrompt }],
        onDelta: (delta) => { fullText += delta; },
        onDone: () => {},
      });

      // Extract JSON from response
      const jsonMatch = fullText.match(/\{[\s\S]*?"clarity"[\s\S]*?\}/);
      if (jsonMatch) {
        const scores = JSON.parse(jsonMatch[0]);
        const overall = Math.round((scores.clarity + scores.specificity + scores.framework) / 3);
        setEvaluation({ ...scores, overall });
      } else {
        throw new Error("Could not parse evaluation");
      }
    } catch {
      toast({ title: "Evaluation Failed", description: "Could not evaluate prompt. Please try again.", variant: "destructive" });
    } finally {
      setIsEvaluating(false);
    }
  }, []);

  const currentLesson = selectedLesson !== null ? lessons.find(l => l.id === selectedLesson) : null;
  const currentChallenge = selectedChallenge !== null ? challenges.find(c => c.id === selectedChallenge) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
          <Pencil className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-card-foreground">Prompt Engineering Lab</h2>
          <p className="text-xs text-muted-foreground">Learn, Practice & Master AI Prompting for Academic Projects</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 bg-muted p-1">
          <TabsTrigger value="learn" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Lessons
          </TabsTrigger>
          <TabsTrigger value="practice" className="gap-1.5 text-xs">
            <Target className="h-3.5 w-3.5" /> Challenges
          </TabsTrigger>
          <TabsTrigger value="sandbox" className="gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" /> Sandbox
          </TabsTrigger>
        </TabsList>

        {/* === LESSONS TAB === */}
        <TabsContent value="learn" className="mt-4">
          {currentLesson ? (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedLesson(null)}>
                ← Back to Lessons
              </Button>
              <div className="bg-card border border-border rounded-lg p-6 shadow-card">
                <div className="flex items-center gap-3 mb-4">
                  <currentLesson.icon className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-display font-bold text-card-foreground">{currentLesson.title}</h3>
                    <Badge variant="outline" className="text-[10px]">{currentLesson.difficulty}</Badge>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-card-foreground">
                  <ReactMarkdown>{currentLesson.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {lessons.map((lesson) => {
                const Icon = lesson.icon;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson.id)}
                    className="text-left bg-card border border-border rounded-lg p-4 hover:shadow-elevated hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <Badge variant="outline" className="text-[10px]">{lesson.difficulty}</Badge>
                    </div>
                    <h4 className="font-semibold text-sm text-card-foreground group-hover:text-primary transition-colors">
                      {lesson.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <ChevronRight className="h-3 w-3" /> Start lesson
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* === CHALLENGES TAB === */}
        <TabsContent value="practice" className="mt-4">
          {currentChallenge ? (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedChallenge(null); setAiResponse(""); setUserPrompt(""); setShowHint(false); setEvaluation(null); }}>
                ← Back to Challenges
              </Button>
              <div className="bg-card border border-border rounded-lg p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-card-foreground">{currentChallenge.title}</h3>
                  <Badge variant="outline">{currentChallenge.difficulty}</Badge>
                </div>
                <p className="text-sm text-card-foreground mb-4">{currentChallenge.task}</p>
                <Button variant="outline" size="sm" className="gap-1 mb-4" onClick={() => setShowHint(!showHint)}>
                  <Lightbulb className="h-3.5 w-3.5" /> {showHint ? "Hide Hint" : "Show Hint"}
                </Button>
                {showHint && (
                  <div className="bg-accent/10 border border-accent/20 rounded-md p-3 mb-4">
                    <p className="text-sm text-accent">{currentChallenge.hint}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Your Prompt</label>
                <Textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Write your prompt here... Try to be as specific and well-structured as possible."
                  className="min-h-[150px]"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => runPrompt(userPrompt, setAiResponse, setIsLoading, "general")} disabled={isLoading || !userPrompt.trim()} className="gap-2">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Test Prompt
                  </Button>
                  <Button variant="secondary" onClick={() => evaluatePrompt(userPrompt)} disabled={isEvaluating || !userPrompt.trim()} className="gap-2">
                    {isEvaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                    Score My Prompt
                  </Button>
                  <Button variant="outline" onClick={() => { setUserPrompt(""); setAiResponse(""); setEvaluation(null); }}>
                    <RotateCcw className="h-4 w-4 mr-1" /> Reset
                  </Button>
                </div>
              </div>

              {evaluation && <PromptScoreCard evaluation={evaluation} />}

              {aiResponse && (
                <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">AI Response</span>
                  </div>
                  <ScrollArea className="max-h-[400px]">
                    <div className="prose prose-sm max-w-none text-card-foreground">
                      <ReactMarkdown>{aiResponse}</ReactMarkdown>
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {challenges.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChallenge(ch.id)}
                  className="text-left bg-card border border-border rounded-lg p-4 hover:shadow-elevated hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-muted-foreground">#{ch.id}</span>
                    <Badge variant="outline" className={
                      ch.difficulty === "Beginner" ? "bg-success/10 text-success border-success/20" :
                      ch.difficulty === "Intermediate" ? "bg-warning/10 text-warning border-warning/20" :
                      "bg-destructive/10 text-destructive border-destructive/20"
                    }>{ch.difficulty}</Badge>
                  </div>
                  <h4 className="font-semibold text-sm text-card-foreground group-hover:text-primary transition-colors mb-1">
                    {ch.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{ch.task}</p>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* === SANDBOX TAB === */}
        <TabsContent value="sandbox" className="mt-4">
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-card-foreground">Free Prompt Sandbox</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Practice any prompt with different AI roles. Experiment freely to improve your prompting skills.
              </p>
              <Select value={sandboxRole} onValueChange={setSandboxRole}>
                <SelectTrigger className="w-full sm:w-[250px] mb-3">
                  <SelectValue placeholder="Select AI Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Assistant</SelectItem>
                  <SelectItem value="researcher">Academic Researcher</SelectItem>
                  <SelectItem value="coder">Software Engineer</SelectItem>
                  <SelectItem value="analyst">Data Analyst</SelectItem>
                  <SelectItem value="writer">Writing Tutor</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={sandboxPrompt}
                onChange={(e) => setSandboxPrompt(e.target.value)}
                placeholder="Enter any prompt to test... Experiment with different frameworks and techniques from the lessons."
                className="min-h-[120px] mb-3"
              />
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => runPrompt(sandboxPrompt, setSandboxResponse, setSandboxLoading, sandboxRole)} disabled={sandboxLoading || !sandboxPrompt.trim()} className="gap-2">
                  {sandboxLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Run Prompt
                </Button>
                <Button variant="secondary" onClick={() => evaluatePrompt(sandboxPrompt)} disabled={isEvaluating || !sandboxPrompt.trim()} className="gap-2">
                  {isEvaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                  Score My Prompt
                </Button>
                <Button variant="outline" onClick={() => { setSandboxPrompt(""); setSandboxResponse(""); setEvaluation(null); }}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Clear
                </Button>
              </div>
            </div>

            {evaluation && <PromptScoreCard evaluation={evaluation} />}

            {sandboxResponse && (
              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground">AI Response ({sandboxRole})</span>
                </div>
                <ScrollArea className="max-h-[500px]">
                  <div className="prose prose-sm max-w-none text-card-foreground">
                    <ReactMarkdown>{sandboxResponse}</ReactMarkdown>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PromptEngineeringLab;
