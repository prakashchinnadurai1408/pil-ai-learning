import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Plus, Trash2, GripVertical, Video, Loader2, Check, Edit, Save, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminModules } from "@/hooks/useAdminModules";
import type { AdminModule } from "@/hooks/useAdminModules";
import { streamChat } from "@/lib/streamChat";

interface GeneratedTopic {
  title: string;
  description: string;
  suggestedVideos: string[];
}

const AIModuleCreator = () => {
  const { adminModules, loading, refetch } = useAdminModules();
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedTopics, setGeneratedTopics] = useState<GeneratedTopic[]>([]);
  const [editingTopic, setEditingTopic] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishConfirmId, setPublishConfirmId] = useState<number | null>(null);

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

  const handleSaveModule = async () => {
    if (generatedTopics.length === 0) {
      toast.error("Generate topics first");
      return;
    }
    // AI-generated content always saves as draft for human review
    setSaving(true);

    const adminUser = sessionStorage.getItem("adminEmail") || sessionStorage.getItem("adminName") || "admin";

    const { data: mod, error: modError } = await supabase
      .from("admin_modules")
      .insert({
        title: moduleTitle.trim(),
        description: moduleDescription.trim() || `Learn about ${moduleTitle}`,
        status: "draft",
        created_by: adminUser,
      })
      .select()
      .single();

    if (modError || !mod) {
      toast.error("Failed to save module");
      setSaving(false);
      return;
    }

    const topicRows = generatedTopics.map((t, i) => ({
      module_id: (mod as any).id,
      title: t.title,
      description: t.description,
      suggested_videos: t.suggestedVideos,
      sort_order: i,
    }));

    const { error: topicError } = await supabase.from("admin_module_topics").insert(topicRows);

    if (topicError) {
      toast.error("Module saved but topics failed to save");
      setSaving(false);
      return;
    }

    toast.success(`Module "${moduleTitle}" saved as draft — review before publishing!`);
    setModuleTitle("");
    setModuleDescription("");
    setGeneratedTopics([]);
    setSaving(false);
    refetch();
  };

  const handlePublishModule = async (id: number) => {
    // CM-01: Block publishing empty courses
    const mod = adminModules.find(m => m.id === id);
    if (!mod || mod.topics.length === 0) {
      toast.error("Cannot publish a module with no topics. Add content first.");
      return;
    }

    const { error } = await supabase
      .from("admin_modules")
      .update({ status: "published" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to publish module");
      return;
    }
    toast.success("Module published after review!");
    setPublishConfirmId(null);
    refetch();
  };

  const handleDeleteModule = async (id: number) => {
    const { error } = await supabase.from("admin_modules").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete module");
      return;
    }
    toast.success("Module deleted");
    refetch();
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

              <div className="flex gap-2">
                <Button className="flex-1 gap-2 bg-gradient-primary border-0 text-primary-foreground" onClick={() => handleSaveModule()} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save as Draft for Review
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                <AlertTriangle className="h-3 w-3 text-warning" />
                AI-generated content must be reviewed before publishing to students.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Modules */}
      <div>
        <h3 className="font-display font-semibold text-card-foreground mb-4">
          All Modules ({loading ? "..." : adminModules.length})
        </h3>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading modules...</div>
        ) : adminModules.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-card border border-border rounded-lg p-8 text-center">
            No modules created yet. Use the AI generator above to create your first module.
          </div>
        ) : (
          <div className="grid gap-3">
            {adminModules.map((m) => (
              <div key={m.id} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {m.id}
                  </div>
                  <div>
                    <span className="font-medium text-sm text-card-foreground">{m.title}</span>
                    <p className="text-xs text-muted-foreground">{m.topics.length} topics · {m.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    m.status === "published" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  }`}>
                    {m.status === "published" ? "Published" : "Draft"}
                  </span>
                  {m.status === "draft" && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setPublishConfirmId(m.id)}>
                      <Check className="h-3 w-3" /> Review & Publish
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteModule(m.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={publishConfirmId !== null} onOpenChange={(open) => !open && setPublishConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirm Publication
            </AlertDialogTitle>
            <AlertDialogDescription>
              Have you reviewed all AI-generated content in this module? Once published, students will be able to access this content immediately. Ensure all topics, descriptions, and video suggestions are accurate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back & Review</AlertDialogCancel>
            <AlertDialogAction onClick={() => publishConfirmId && handlePublishModule(publishConfirmId)}>
              Yes, Publish Module
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AIModuleCreator;
