import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, Play, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface Settings {
  id: string;
  enabled: boolean;
  frequency: string;
  day_of_week: number;
  day_of_month: number;
  hour_utc: number;
  minute_utc: number;
  last_run_at: string | null;
  last_run_count: number;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

  const update = (patch: Partial<Settings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...patch });
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await (supabase.from("path_regeneration_settings") as any)
      .update({
        enabled: settings.enabled,
        frequency: settings.frequency,
        day_of_week: settings.day_of_week,
        day_of_month: settings.day_of_month,
        hour_utc: settings.hour_utc,
        minute_utc: settings.minute_utc,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save schedule");
    } else {
      toast.success("Schedule saved");
      load();
    }
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
        body: JSON.stringify({ force: true }),
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

  if (loading || !settings) {
    return <div className="h-32 bg-muted/30 rounded-lg animate-pulse" />;
  }

  const freq = settings.frequency || "weekly";
  const scheduleSummary = (() => {
    const time = `${String(settings.hour_utc).padStart(2, "0")}:${String(settings.minute_utc).padStart(2, "0")} UTC`;
    if (freq === "daily") return `Every day at ${time}`;
    if (freq === "weekly") return `Every ${DAYS[settings.day_of_week]} at ${time}`;
    if (freq === "biweekly") return `Every other ${DAYS[settings.day_of_week]} at ${time}`;
    if (freq === "monthly") return `On day ${settings.day_of_month} of each month at ${time}`;
    return time;
  })();

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
            <p className="text-sm font-medium text-card-foreground">Enable auto-regeneration</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When enabled, all existing AI candidate paths regenerate on the schedule below so they stay
              adaptive as candidates progress.
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
            disabled={saving}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Frequency</Label>
            <Select value={freq} onValueChange={(v) => update({ frequency: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(freq === "weekly" || freq === "biweekly") && (
            <div>
              <Label className="text-xs text-muted-foreground">Day of week</Label>
              <Select
                value={String(settings.day_of_week)}
                onValueChange={(v) => update({ day_of_week: Number(v) })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {freq === "monthly" && (
            <div>
              <Label className="text-xs text-muted-foreground">Day of month (1–28)</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={settings.day_of_month}
                onChange={(e) =>
                  update({ day_of_month: Math.max(1, Math.min(28, Number(e.target.value) || 1)) })
                }
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Hour (UTC, 0–23)</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={settings.hour_utc}
              onChange={(e) =>
                update({ hour_utc: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })
              }
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Minute (UTC, 0–59)</Label>
            <Input
              type="number"
              min={0}
              max={59}
              value={settings.minute_utc}
              onChange={(e) =>
                update({ minute_utc: Math.max(0, Math.min(59, Number(e.target.value) || 0)) })
              }
              className="mt-1"
            />
          </div>
        </div>

        <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="text-foreground font-medium">Schedule:</span> {scheduleSummary}
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border flex-wrap">
          <div className="text-xs text-muted-foreground">
            {settings.last_run_at ? (
              <>
                Last run: <span className="text-foreground font-medium">{new Date(settings.last_run_at).toLocaleString()}</span>
                {" · "}
                <Badge variant="outline" className="text-xs">{settings.last_run_count} regenerated</Badge>
              </>
            ) : (
              "Has not run yet."
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save schedule
            </Button>
            <Button size="sm" onClick={runNow} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? "Running…" : "Run Now"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PathRegenerationSettings;
