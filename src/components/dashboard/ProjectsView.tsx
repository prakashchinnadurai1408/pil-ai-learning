import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, ExternalLink, Clock, Users, Star, ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { usePublishedSectionContent } from "@/hooks/useAdminSectionContent";

interface Project {
  id: number;
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  module: string;
  estimatedTime: string;
  skills: string[];
  steps: string[];
}

const projects: Project[] = [
  {
    id: 1,
    title: "AI Study Assistant Chatbot",
    description: "Build a chatbot that helps students study by answering questions from uploaded notes and textbooks using RAG techniques.",
    difficulty: "Intermediate",
    module: "RAG + Prompt Engineering",
    estimatedTime: "4-6 hours",
    skills: ["Prompt Engineering", "RAG", "API Integration"],
    steps: [
      "Design the chatbot's persona and system prompt",
      "Set up a knowledge base with study materials",
      "Implement RAG to retrieve relevant content",
      "Build a chat interface for Q&A",
      "Add follow-up question suggestions",
      "Test with real study scenarios",
    ],
  },
  {
    id: 2,
    title: "AI-Powered Resume Builder",
    description: "Create an application that uses AI to generate, optimize, and tailor resumes for specific job descriptions.",
    difficulty: "Beginner",
    module: "AI Tools + Prompt Engineering",
    estimatedTime: "3-4 hours",
    skills: ["Prompt Engineering", "API Calls", "UI Design"],
    steps: [
      "Design a form for user details (education, skills, experience)",
      "Create prompts to generate resume sections",
      "Add job description input for tailoring",
      "Implement AI-powered bullet point optimization",
      "Add export/download functionality",
      "Test with different job roles",
    ],
  },
  {
    id: 3,
    title: "Multi-Modal Content Creator",
    description: "Build a tool that takes a topic and generates a complete content package: blog post, social media captions, and image prompts.",
    difficulty: "Intermediate",
    module: "Multimodal AI + Workflow Automation",
    estimatedTime: "5-7 hours",
    skills: ["Multimodal AI", "Prompt Chaining", "Content Strategy"],
    steps: [
      "Design the content creation workflow",
      "Build prompts for blog post generation",
      "Create prompts for social media captions (Twitter, LinkedIn, Instagram)",
      "Generate image description prompts for DALL-E/Midjourney",
      "Chain all prompts into an automated pipeline",
      "Add editing and refinement features",
    ],
  },
  {
    id: 4,
    title: "AI Code Review Agent",
    description: "Create an AI agent that reviews code, identifies bugs, suggests improvements, and explains code logic to beginners.",
    difficulty: "Advanced",
    module: "AI Agents + LLM Models",
    estimatedTime: "6-8 hours",
    skills: ["AI Agents", "Code Analysis", "LLM Integration"],
    steps: [
      "Design the code review agent's capabilities",
      "Create specialized prompts for bug detection",
      "Build prompts for code quality analysis",
      "Implement code explanation for beginners",
      "Add support for multiple programming languages",
      "Create an interactive review interface",
    ],
  },
  {
    id: 5,
    title: "AI Research Paper Summarizer",
    description: "Build a tool that takes research papers (PDFs) and generates structured summaries, key findings, methodology overview, and citations.",
    difficulty: "Beginner",
    module: "AI Tools + RAG",
    estimatedTime: "3-5 hours",
    skills: ["Text Processing", "Summarization", "Prompt Design"],
    steps: [
      "Design the summarization template",
      "Create prompts for extracting key sections",
      "Build methodology extraction prompts",
      "Implement citation formatting",
      "Add comparison feature for multiple papers",
      "Test with actual research papers",
    ],
  },
  {
    id: 6,
    title: "AI-Powered Quiz Platform",
    description: "Create a platform that generates quizzes from any topic or uploaded content, with difficulty levels, explanations, and score tracking.",
    difficulty: "Intermediate",
    module: "Fine-Tuning + AI SaaS",
    estimatedTime: "5-7 hours",
    skills: ["Quiz Generation", "API Integration", "State Management"],
    steps: [
      "Design the quiz generation prompt structure",
      "Implement difficulty-based question generation",
      "Build answer validation and scoring logic",
      "Add explanation generation for wrong answers",
      "Create progress tracking dashboard",
      "Add timed quiz mode",
    ],
  },
];

const difficultyColor = {
  Beginner: "text-success bg-success/10",
  Intermediate: "text-warning bg-warning/10",
  Advanced: "text-destructive bg-destructive/10",
};

const ProjectsView = () => {
  const { items: adminProjects } = usePublishedSectionContent("projects");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (stepIndex: number) => {
    setCompletedSteps(prev => ({ ...prev, [stepIndex]: !prev[stepIndex] }));
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;

  if (selectedProject) {
    const progress = selectedProject.steps.length > 0
      ? Math.round((completedCount / selectedProject.steps.length) * 100)
      : 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">{selectedProject.title}</h3>
            <p className="text-sm text-muted-foreground">{selectedProject.module}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedProject(null); setCompletedSteps({}); }}>
            ← All Projects
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-lg border border-border p-5 shadow-card">
              <h4 className="font-display font-semibold mb-2 text-card-foreground">Project Overview</h4>
              <p className="text-sm text-muted-foreground mb-4">{selectedProject.description}</p>
              <div className="flex flex-wrap gap-2">
                {selectedProject.skills.map(skill => (
                  <span key={skill} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-display font-semibold text-card-foreground">Steps to Complete</h4>
                <span className="text-xs text-muted-foreground">{completedCount}/{selectedProject.steps.length} done</span>
              </div>
              <div className="space-y-3">
                {selectedProject.steps.map((step, i) => (
                  <button
                    key={i}
                    onClick={() => toggleStep(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-colors ${
                      completedSteps[i]
                        ? "border-success/30 bg-success/5 text-success"
                        : "border-border hover:border-primary/30 text-foreground"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      completedSteps[i] ? "bg-success text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {completedSteps[i] ? <CheckCircle className="h-4 w-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                    </div>
                    <span className={completedSteps[i] ? "line-through" : ""}>{step}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card rounded-lg border border-border p-5 shadow-card">
              <h4 className="font-display font-semibold mb-3 text-card-foreground">Progress</h4>
              <div className="text-center mb-3">
                <p className="text-3xl font-display font-bold text-primary">{progress}%</p>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="bg-card rounded-lg border border-border p-5 shadow-card space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Est. Time:</span>
                <span className="font-medium text-foreground">{selectedProject.estimatedTime}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Difficulty:</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor[selectedProject.difficulty]}`}>
                  {selectedProject.difficulty}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h3 className="font-display font-semibold text-lg text-foreground">AI Projects</h3>
        <p className="text-sm text-muted-foreground">
          Hands-on projects to apply your AI learning. Build real tools and add them to your portfolio.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div key={project.id} className="bg-card rounded-lg border border-border p-5 shadow-card hover:shadow-elevated transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor[project.difficulty]}`}>
                {project.difficulty}
              </span>
            </div>
            <h4 className="font-display font-semibold text-card-foreground mb-1">{project.title}</h4>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {project.estimatedTime}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {project.steps.length} steps</span>
            </div>
            <Button
              onClick={() => setSelectedProject(project)}
              className="w-full bg-gradient-primary border-0 text-primary-foreground gap-2"
              size="sm"
            >
              Start Project <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Admin-published projects */}
      {adminProjects.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent" />
            <h4 className="font-display font-semibold text-foreground">Additional Projects</h4>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminProjects.map(item => {
              const c = item.content || {};
              return (
                <div key={item.id} className="bg-card rounded-lg border border-accent/20 p-5 shadow-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <FolderKanban className="h-5 w-5 text-accent" />
                    </div>
                    {c.difficulty && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.difficulty === "Beginner" ? "text-success bg-success/10" :
                        c.difficulty === "Advanced" ? "text-destructive bg-destructive/10" :
                        "text-warning bg-warning/10"
                      }`}>{c.difficulty}</span>
                    )}
                  </div>
                  <h4 className="font-display font-semibold text-card-foreground mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{c.description || ""}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {c.estimatedTime && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.estimatedTime}</span>}
                    {c.steps && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.steps.length} steps</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsView;
