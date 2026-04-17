import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Settings {
  id: string;
  enabled: boolean;
  frequency: string;
  last_run_at: string | null;
  last_run_count: number;
}

const PathRegenerationSettings = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from("path_regeneration_settings") as any)
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSettings(data || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleEnabled = async (enabled: boolean) => {
    if (!settings) return;
    setSaving(true);
    await (supabase.from("path_regeneration_settings") as any)
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq("id", settings.id);
    toast.success(enabled ? "Weekly auto-regeneration enabled" : "Auto-regeneration disabled");
    setSaving(false);
    load();
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/regenerate-all-paths`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Failed");
      toast.success(`Regenerated ${json.regenerated} of ${json.total} paths`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Run failed");
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="h-32 bg-muted/30 rounded-lg animate-pulse" />;
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" /> Auto-Regeneration Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-card-foreground">Weekly auto-regeneration</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When enabled, all existing AI candidate paths are regenerated every Monday at 02:00 UTC so they stay
              adaptive as candidates progress.
            </p>
          </div>
          <Switch checked={settings?.enabled || false} onCheckedChange={toggleEnabled} disabled={saving} />
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {settings?.last_run_at ? (
              <>
                Last run: <span className="text-foreground font-medium">{new Date(settings.last_run_at).toLocaleString()}</span>
                {" · "}
                <Badge variant="outline" className="text-xs">{settings.last_run_count} regenerated</Badge>
              </>
            ) : (
              "Has not run yet."
            )}
          </div>
          <Button size="sm" variant="outline" onClick={runNow} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running…" : "Run Now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PathRegenerationSettings;
