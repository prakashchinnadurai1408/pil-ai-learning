import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Save, Loader2, Brain, KeyRound, Youtube, RefreshCw, CheckCircle2, Sliders } from "lucide-react";
import { toast } from "sonner";

type ProviderKey = "lovable" | "openai" | "anthropic" | "deepseek" | "xai";
type Difficulty = "easy" | "medium" | "hard";
type AgeKey = "10-14" | "15-18" | "19-22" | "23+";

const AGE_GROUPS: { key: AgeKey; label: string }[] = [
  { key: "10-14", label: "10–14 years" },
  { key: "15-18", label: "15–18 years" },
  { key: "19-22", label: "19–22 years" },
  { key: "23+",   label: "23+ years" },
];

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const DEFAULT_OVERRIDES: Record<AgeKey, { floor: Difficulty; ceiling: Difficulty }> = {
  "10-14": { floor: "easy", ceiling: "easy" },
  "15-18": { floor: "easy", ceiling: "medium" },
  "19-22": { floor: "easy", ceiling: "hard" },
  "23+":   { floor: "easy", ceiling: "hard" },
};

const PROVIDERS: {
  key: ProviderKey;
  label: string;
  description: string;
  models: { id: string; label: string }[];
  needsKey: boolean;
}[] = [
  {
    key: "lovable",
    label: "Lovable AI (Gemini + GPT-5)",
    description: "Bundled gateway — no API key required.",
    needsKey: false,
    models: [
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (preview)" },
      { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview)" },
      { id: "openai/gpt-5-nano", label: "GPT-5 Nano" },
      { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
      { id: "openai/gpt-5", label: "GPT-5" },
      { id: "openai/gpt-5.2", label: "GPT-5.2" },
    ],
  },
  {
    key: "openai",
    label: "OpenAI (direct)",
    description: "Use your own OpenAI API key for ChatGPT models.",
    needsKey: true,
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4.1", label: "GPT-4.1" },
    ],
  },
  {
    key: "anthropic",
    label: "Anthropic Claude",
    description: "Use your Anthropic API key for Claude models.",
    needsKey: true,
    models: [
      { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
      { id: "claude-opus-4-latest", label: "Claude Opus 4" },
    ],
  },
  {
    key: "deepseek",
    label: "DeepSeek",
    description: "Use your DeepSeek API key.",
    needsKey: true,
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
  },
  {
    key: "xai",
    label: "xAI Grok",
    description: "Use your xAI API key for Grok models.",
    needsKey: true,
    models: [
      { id: "grok-2-latest", label: "Grok 2" },
      { id: "grok-beta", label: "Grok Beta" },
    ],
  },
];

interface LLMRow {
  id: string;
  default_provider: string;
  default_model: string;
  enabled_providers: Record<string, boolean>;
  provider_models: Record<string, string>;
  age_group_difficulty_overrides: Record<AgeKey, { floor: Difficulty; ceiling: Difficulty }>;
}

const LLMSettings = () => {
  const [row, setRow] = useState<LLMRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingYT, setTestingYT] = useState(false);
  const [ytResult, setYtResult] = useState<{ ok: boolean; message: string; videoId?: string | null } | null>(null);

  const testYouTubeKey = async () => {
    setTestingYT(true);
    setYtResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-search", {
        body: { query: "intro to artificial intelligence", maxResults: 1 },
      });
      if (error) {
        setYtResult({ ok: false, message: error.message || "Edge function call failed" });
      } else if (data?.error) {
        setYtResult({ ok: false, message: data.error });
      } else if (data?.videoId) {
        setYtResult({ ok: true, message: `Key works — found video ID ${data.videoId}`, videoId: data.videoId });
        toast.success("YouTube API key is valid");
      } else {
        setYtResult({ ok: false, message: "No video returned. Key may be invalid or quota exhausted." });
      }
    } catch (e: any) {
      setYtResult({ ok: false, message: e?.message || "Network error" });
    } finally {
      setTestingYT(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("llm_settings").select("*").limit(1).maybeSingle();
      if (data) {
        const overridesRaw = (data as any).age_group_difficulty_overrides as
          | Record<AgeKey, { floor: Difficulty; ceiling: Difficulty }>
          | null;
        setRow({
          id: data.id,
          default_provider: data.default_provider,
          default_model: data.default_model,
          enabled_providers: (data.enabled_providers as Record<string, boolean>) || {},
          provider_models: (data.provider_models as Record<string, string>) || {},
          age_group_difficulty_overrides: overridesRaw && Object.keys(overridesRaw).length
            ? overridesRaw
            : DEFAULT_OVERRIDES,
        });
      }
      setLoading(false);
    })();
  }, []);

  const toggleProvider = (key: ProviderKey, enabled: boolean) => {
    if (!row) return;
    setRow({ ...row, enabled_providers: { ...row.enabled_providers, [key]: enabled } });
  };

  const setProviderModel = (key: ProviderKey, modelId: string) => {
    if (!row) return;
    setRow({ ...row, provider_models: { ...row.provider_models, [key]: modelId } });
  };

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase.from("llm_settings").update({
      default_provider: row.default_provider,
      default_model: row.default_model,
      enabled_providers: row.enabled_providers,
      provider_models: row.provider_models,
      age_group_difficulty_overrides: row.age_group_difficulty_overrides as any,
      updated_at: new Date().toISOString(),
      updated_by: sessionStorage.getItem("adminEmail") || "admin",
    } as any).eq("id", row.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("LLM settings saved");
    }
  };

  if (loading || !row) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const defaultProviderObj = PROVIDERS.find((p) => p.key === row.default_provider);
  const allModels = PROVIDERS.flatMap((p) =>
    p.models.map((m) => ({ id: m.id, label: `${p.label} · ${m.label}`, provider: p.key }))
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-destructive" /> YouTube Data API key
          </CardTitle>
          <CardDescription>
            Used by the video lesson finder and AI-generated module content to fetch real YouTube video IDs.
            The key is stored securely as a backend secret and never exposed to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">
              Current status: <strong className="text-foreground">YOUTUBE_API_KEY is configured</strong>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={testYouTubeKey}
              disabled={testingYT}
              className="gap-2"
            >
              {testingYT ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
              Test YouTube API
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                toast.info("Ask Lovable to rotate the YouTube API key", {
                  description:
                    "In Lovable chat, send: \"Update the YOUTUBE_API_KEY secret\" — a secure form will appear to paste the new key.",
                  duration: 9000,
                });
              }}
            >
              <RefreshCw className="h-4 w-4" /> How to update the key
            </Button>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs text-primary underline-offset-4 hover:underline self-center"
            >
              Get a key from Google Cloud Console →
            </a>
          </div>
          {ytResult && (
            <div
              className={`text-sm rounded-md border px-3 py-2 ${
                ytResult.ok
                  ? "border-primary/30 bg-primary/5 text-foreground"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              }`}
            >
              {ytResult.message}
              {ytResult.ok && ytResult.videoId && (
                <a
                  href={`https://www.youtube.com/watch?v=${ytResult.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 underline underline-offset-4"
                >
                  Open video ↗
                </a>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Tip: Enable <strong>YouTube Data API v3</strong> on your Google Cloud project, then create an API key
            and restrict it to that API for safety. After updating, edge functions pick up the new key within seconds.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> Default model
          </CardTitle>
          <CardDescription>
            Pick the provider and model used by Prakash and the AI Coach when no override is specified.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default provider</Label>
            <Select
              value={row.default_provider}
              onValueChange={(v) => setRow({ ...row, default_provider: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default model</Label>
            <Select
              value={row.default_model}
              onValueChange={(v) => setRow({ ...row, default_model: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(defaultProviderObj?.models || allModels).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {PROVIDERS.map((p) => {
          const enabled = row.enabled_providers[p.key] ?? false;
          const selected = row.provider_models[p.key] ?? p.models[0]?.id;
          return (
            <Card key={p.key} className={enabled ? "border-primary/30" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {p.label}
                      {!p.needsKey && <Badge variant="secondary" className="ml-2 text-xs">Built-in</Badge>}
                      {p.needsKey && <Badge variant="outline" className="ml-2 text-xs gap-1"><KeyRound className="h-3 w-3" /> API key</Badge>}
                    </CardTitle>
                    <CardDescription className="mt-1">{p.description}</CardDescription>
                  </div>
                  <Switch checked={enabled} onCheckedChange={(v) => toggleProvider(p.key, v)} />
                </div>
              </CardHeader>
              {enabled && (
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Preferred model</Label>
                    <Select value={selected} onValueChange={(v) => setProviderModel(p.key, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {p.models.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {p.needsKey && (
                    <p className="text-xs text-muted-foreground">
                      Add the API key in <strong>Application Settings → Secrets</strong> when enabling this provider in production.
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" /> Adaptive Difficulty by Age Group
          </CardTitle>
          <CardDescription>
            Override the floor and ceiling difficulty the Adaptive AI Agent will use when picking
            quiz/coding challenge difficulty for each age group. The agent starts at the floor and
            ramps up to the ceiling as scores improve. To lock an age group at one difficulty, set
            floor and ceiling to the same value.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {AGE_GROUPS.map((g) => {
              const ov = row.age_group_difficulty_overrides[g.key] || DEFAULT_OVERRIDES[g.key];
              const invalid = DIFFICULTY_RANK[ov.floor] > DIFFICULTY_RANK[ov.ceiling];
              return (
                <div
                  key={g.key}
                  className={`grid sm:grid-cols-3 gap-3 items-end rounded-lg border p-3 ${
                    invalid ? "border-destructive/50 bg-destructive/5" : "border-border"
                  }`}
                >
                  <div>
                    <Label className="text-sm font-medium">{g.label}</Label>
                    {invalid && (
                      <p className="text-xs text-destructive mt-1">
                        Floor must be ≤ ceiling
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Floor (start at)</Label>
                    <Select
                      value={ov.floor}
                      onValueChange={(v: Difficulty) =>
                        setRow({
                          ...row,
                          age_group_difficulty_overrides: {
                            ...row.age_group_difficulty_overrides,
                            [g.key]: { ...ov, floor: v },
                          },
                        })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTY_OPTIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Ceiling (max)</Label>
                    <Select
                      value={ov.ceiling}
                      onValueChange={(v: Difficulty) =>
                        setRow({
                          ...row,
                          age_group_difficulty_overrides: {
                            ...row.age_group_difficulty_overrides,
                            [g.key]: { ...ov, ceiling: v },
                          },
                        })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTY_OPTIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRow({ ...row, age_group_difficulty_overrides: DEFAULT_OVERRIDES })
            }
          >
            Reset to defaults
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </Button>
      </div>
    </div>
  );
};

export default LLMSettings;
