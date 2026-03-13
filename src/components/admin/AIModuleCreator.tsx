import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Plus, Trash2, GripVertical, Video, BookOpen, Loader2, Check, Edit, Save } from "lucide-react";
import { toast } from "sonner";
import { modules } from "@/data/modules";
import { streamChat } from "@/lib/streamChat";

interface GeneratedTopic {
  title: string;
  description: string;
  suggestedVideos: string[];
}

interface ModuleItem {
  id: number;
  title: string;
  description: string;
  topics: GeneratedTopic[];
  status: "draft" | "published";
}

const AIModuleCreator = () => {
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedTopics, setGeneratedTopics] = useState<GeneratedTopic[]>([]);
  const [createdModules, setCreatedModules] = useState<ModuleItem[]>(
    modules.map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      topics: m.topics.map(t => ({ title: t, description: "", suggestedVideos: [] })),
      status: "published" as const,
    }))
  );
  const [editingTopic, setEditingTopic] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!moduleTitle.trim()) {
      toast.error("Enter a module title first");
      return;
    }
    setGenerating(true);
    setGeneratedTopics([]);

    let fullResponse = "";

    try {
      await streamChat({
        messages: [
          {
            role: "user",
            content: `Generate 5-7 topics for an AI learning module titled "${moduleTitle}". ${moduleDescription ? `Description: ${moduleDescription}.` : ""} For each topic, provide:
1. A clear topic title
2. A brief description (1-2 sentences)
3. 2-3 suggested YouTube video search queries for learning this topic

Return ONLY valid JSON in this exact format, no other text:
[{"title":"Topic Name","description":"Brief description","suggestedVideos":["search query 1","search query 2"]}]`,
          },
        ],
        onDelta: (chunk) => {
          fullResponse += chunk;
        },
        onDone: () => {
          try {
            // Extract JSON from the response
            const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]) as GeneratedTopic[];
              setGeneratedTopics(parsed);
              toast.success(`Generated ${parsed.length} topics!`);
            } else {
              toast.error("Failed to parse AI response. Try again.");
            }
          } catch {
            toast.error("Failed to parse AI response. Try again.");
          }
          setGenerating(false);
        },
      });
    } catch {
      toast.error("AI generation failed. Please try again.");
      setGenerating(false);
    }
  };

  const handleRemoveTopic = (index: number) => {
    setGeneratedTopics(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateTopic = (index: number, field: keyof GeneratedTopic, value: string | string[]) => {
    setGeneratedTopics(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const handleSaveModule = () => {
    if (generatedTopics.length === 0) {
      toast.error("Generate topics first");
      return;
    }
    const newModule: ModuleItem = {
      id: createdModules.length + 1,
      title: moduleTitle,
      description: moduleDescription || `Learn about ${moduleTitle}`,
      topics: generatedTopics,
      status: "draft",
    };
    setCreatedModules(prev => [...prev, newModule]);
    setModuleTitle("");
    setModuleDescription("");
    setGeneratedTopics([]);
    toast.success(`Module "${newModule.title}" saved as draft!`);
  };

  const handlePublishModule = (id: number) => {
    setCreatedModules(prev => prev.map(m => m.id === id ? { ...m, status: "published" } : m));
    toast.success("Module published!");
  };

  return (
    <div className="space-y-6">
      {/* AI Generator Card */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Module with AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Module Title</Label>
            <Input
              placeholder="e.g., Advanced Prompt Engineering, AI Ethics, etc."
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="Brief description of what this module should cover..."
              value={moduleDescription}
              onChange={(e) => setModuleDescription(e.target.value)}
              rows={2}
            />
          </div>
          <Button
            className="gap-2 bg-gradient-accent border-0 text-accent-foreground hover:opacity-90"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating Topics..." : "Generate Topics with AI"}
          </Button>

          {/* Generated Topics */}
          {generatedTopics.length > 0 && (
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-semibold text-sm text-card-foreground">Generated Topics ({generatedTopics.length})</h4>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setGeneratedTopics(prev => [...prev, { title: "", description: "", suggestedVideos: [] }])}>
                  <Plus className="h-3 w-3" /> Add Topic
                </Button>
              </div>
              {generatedTopics.map((topic, i) => (
                <div key={i} className="bg-card rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                      {editingTopic === i ? (
                        <Input
                          value={topic.title}
                          onChange={(e) => handleUpdateTopic(i, "title", e.target.value)}
                          className="h-7 text-sm"
                        />
                      ) : (
                        <span className="font-medium text-sm text-card-foreground">{topic.title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingTopic(editingTopic === i ? null : i)}>
                        {editingTopic === i ? <Save className="h-3 w-3 text-success" /> : <Edit className="h-3 w-3 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveTopic(i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {topic.description && (
                    <p className="text-xs text-muted-foreground pl-11">{topic.description}</p>
                  )}
                  {topic.suggestedVideos.length > 0 && (
                    <div className="pl-11 flex flex-wrap gap-1.5">
                      {topic.suggestedVideos.map((v, vi) => (
                        <span key={vi} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                          <Video className="h-3 w-3" /> {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <Button className="w-full gap-2 bg-gradient-primary border-0 text-primary-foreground" onClick={handleSaveModule}>
                <Save className="h-4 w-4" /> Save Module as Draft
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Modules */}
      <div>
        <h3 className="font-display font-semibold text-card-foreground mb-4">All Modules ({createdModules.length})</h3>
        <div className="grid gap-3">
          {createdModules.map((m) => (
            <div key={m.id} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {m.id}
                </div>
                <div>
                  <span className="font-medium text-sm text-card-foreground">{m.title}</span>
                  <p className="text-xs text-muted-foreground">{m.topics.length} topics</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  m.status === "published" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                }`}>
                  {m.status === "published" ? "Published" : "Draft"}
                </span>
                {m.status === "draft" && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handlePublishModule(m.id)}>
                    <Check className="h-3 w-3" /> Publish
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIModuleCreator;
