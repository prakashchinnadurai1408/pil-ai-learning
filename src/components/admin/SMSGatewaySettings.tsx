import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Save, Loader2, KeyRound, ShieldCheck, AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Provider = "twilio" | "msg91" | "generic";

interface SMSRow {
  id: string;
  provider: Provider;
  enabled: boolean;
  sender_id: string;
  otp_template: string;
  otp_length: number;
  otp_validity_minutes: number;
  twilio_account_sid: string;
  twilio_from_number: string;
  msg91_auth_key_set: boolean;
  msg91_template_id: string;
  msg91_dlt_te_id: string;
  generic_endpoint_url: string;
  generic_http_method: string;
  generic_headers: Record<string, string>;
  generic_body_template: string;
  generic_auth_key_set: boolean;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  twilio: "Twilio",
  msg91: "MSG91 (India)",
  generic: "Generic HTTP gateway",
};

const SMSGatewaySettings = () => {
  const [row, setRow] = useState<SMSRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [headersText, setHeadersText] = useState("{}");
  const [testMobile, setTestMobile] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const sendTestOtp = async () => {
    if (!testMobile.trim()) {
      toast.error("Enter a mobile number to test");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-test-otp", {
        body: { mobile: testMobile.trim() },
      });
      if (error) {
        setTestResult({ ok: false, message: error.message || "Edge function call failed" });
      } else if ((data as any)?.error) {
        setTestResult({ ok: false, message: (data as any).error });
      } else if ((data as any)?.ok) {
        setTestResult({
          ok: true,
          message: `Sent via ${(data as any).provider} to ${(data as any).to} (OTP ${(data as any).otp_preview})`,
        });
        toast.success("Test OTP sent");
      } else {
        setTestResult({ ok: false, message: "Unexpected response from gateway" });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message || "Network error" });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    (async () => {
      const adminEmail = sessionStorage.getItem("adminEmail") || "";
      const { data, error } = await supabase.functions.invoke("update-sms-gateway", {
        method: "GET",
        headers: { "x-admin-email": adminEmail },
      });
      const r = (data as any)?.row;
      if (!error && r) {
        const headers = (r.generic_headers as Record<string, string>) || {};
        setRow({
          id: r.id,
          provider: r.provider as Provider,
          enabled: r.enabled,
          sender_id: r.sender_id || "",
          otp_template: r.otp_template || "",
          otp_length: r.otp_length || 6,
          otp_validity_minutes: r.otp_validity_minutes || 5,
          twilio_account_sid: r.twilio_account_sid || "",
          twilio_from_number: r.twilio_from_number || "",
          msg91_auth_key_set: !!r.msg91_auth_key_set,
          msg91_template_id: r.msg91_template_id || "",
          msg91_dlt_te_id: r.msg91_dlt_te_id || "",
          generic_endpoint_url: r.generic_endpoint_url || "",
          generic_http_method: r.generic_http_method || "POST",
          generic_headers: headers,
          generic_body_template: r.generic_body_template || "",
          generic_auth_key_set: !!r.generic_auth_key_set,
        });
        setHeadersText(JSON.stringify(headers, null, 2));
      }
      setLoading(false);
    })();
  }, []);

  const update = (patch: Partial<SMSRow>) => row && setRow({ ...row, ...patch });

  const save = async () => {
    if (!row) return;
    let parsedHeaders: Record<string, string> = {};
    try {
      parsedHeaders = JSON.parse(headersText || "{}");
      if (typeof parsedHeaders !== "object" || Array.isArray(parsedHeaders)) throw new Error();
    } catch {
      toast.error("Generic headers must be valid JSON object");
      return;
    }
    // Client-side guards mirror server validation for instant feedback
    if (!row.otp_template.includes("{otp}")) {
      toast.error("OTP template must contain the {otp} placeholder");
      return;
    }
    if (row.otp_template.trim().length < 10 || row.otp_template.length > 300) {
      toast.error("OTP template must be 10–300 characters");
      return;
    }
    if (row.otp_length < 4 || row.otp_length > 8) {
      toast.error("OTP length must be between 4 and 8");
      return;
    }
    if (row.otp_validity_minutes < 1 || row.otp_validity_minutes > 30) {
      toast.error("OTP validity must be between 1 and 30 minutes");
      return;
    }

    setSaving(true);
    const adminEmail = sessionStorage.getItem("adminEmail") || "";
    const { data, error } = await supabase.functions.invoke("update-sms-gateway", {
      body: {
        provider: row.provider,
        enabled: row.enabled,
        sender_id: row.sender_id,
        otp_template: row.otp_template,
        otp_length: row.otp_length,
        otp_validity_minutes: row.otp_validity_minutes,
        twilio_account_sid: row.twilio_account_sid,
        twilio_from_number: row.twilio_from_number,
        msg91_template_id: row.msg91_template_id,
        msg91_dlt_te_id: row.msg91_dlt_te_id,
        generic_endpoint_url: row.generic_endpoint_url,
        generic_http_method: row.generic_http_method,
        generic_headers: parsedHeaders,
        generic_body_template: row.generic_body_template,
      },
      headers: { "x-admin-email": adminEmail },
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }
    if ((data as any)?.error) {
      toast.error((data as any).error);
      return;
    }
    toast.success("SMS gateway settings saved");
  };

  if (loading || !row) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> SMS Gateway (OTP delivery)
            </CardTitle>
            <CardDescription>
              Configure the SMS provider used to send login OTPs to user mobile numbers. Secret API
              keys are stored separately as backend secrets — only non-secret IDs are saved here.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Enabled</Label>
            <Switch checked={row.enabled} onCheckedChange={(v) => update({ enabled: v })} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-foreground flex gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <span>
            <strong>Store-only mode:</strong> saving here records your gateway configuration. The current
            login flow continues to use the development OTP <code className="font-mono">1234</code> until
            the backend is wired to send real OTPs through this provider.
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={row.provider} onValueChange={(v: Provider) => update({ provider: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="msg91">MSG91 (India)</SelectItem>
                <SelectItem value="generic">Generic HTTP gateway</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sender ID / From label</Label>
            <Input
              value={row.sender_id}
              maxLength={32}
              placeholder="AIUPHB"
              onChange={(e) => update({ sender_id: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>OTP length</Label>
            <Select
              value={String(row.otp_length)}
              onValueChange={(v) => update({ otp_length: Number(v) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[4, 5, 6, 8].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} digits</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>OTP message template</Label>
            <Textarea
              rows={3}
              value={row.otp_template}
              maxLength={300}
              onChange={(e) => update({ otp_template: e.target.value })}
              placeholder="Your OTP is {otp}. Valid for 5 minutes."
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="font-mono">{"{otp}"}</code> as the placeholder for the generated code.
            </p>
          </div>
          <div className="space-y-2">
            <Label>OTP validity (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={row.otp_validity_minutes}
              onChange={(e) => update({ otp_validity_minutes: Math.max(1, Math.min(30, Number(e.target.value) || 5)) })}
            />
          </div>
        </div>

        {row.provider === "twilio" && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Badge variant="secondary">{PROVIDER_LABELS.twilio}</Badge>
              </h4>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> Auth Token stored as backend secret
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Account SID</Label>
                <Input
                  value={row.twilio_account_sid}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  onChange={(e) => update({ twilio_account_sid: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">From number (E.164)</Label>
                <Input
                  value={row.twilio_from_number}
                  placeholder="+15558675310"
                  onChange={(e) => update({ twilio_from_number: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Add <strong>TWILIO_AUTH_TOKEN</strong> in Application Settings → Secrets when you wire
              up real OTP sending.
            </p>
          </div>
        )}

        {row.provider === "msg91" && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Badge variant="secondary">{PROVIDER_LABELS.msg91}</Badge>
              </h4>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> Auth Key stored as backend secret
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Template ID</Label>
                <Input
                  value={row.msg91_template_id}
                  placeholder="64f1a2b3c4d5e6f7a8b9c0d1"
                  onChange={(e) => update({ msg91_template_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">DLT Template Entity ID</Label>
                <Input
                  value={row.msg91_dlt_te_id}
                  placeholder="1707xxxxxxxxxxxxxx"
                  onChange={(e) => update({ msg91_dlt_te_id: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Add <strong>MSG91_AUTH_KEY</strong> in Application Settings → Secrets. India users must
              register a DLT template before sending.
            </p>
          </div>
        )}

        {row.provider === "generic" && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Badge variant="secondary">{PROVIDER_LABELS.generic}</Badge>
              </h4>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> Auth header value stored as backend secret
              </span>
            </div>
            <div className="grid sm:grid-cols-[1fr_120px] gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Endpoint URL</Label>
                <Input
                  value={row.generic_endpoint_url}
                  placeholder="https://api.example.com/sms/send"
                  onChange={(e) => update({ generic_endpoint_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Method</Label>
                <Select
                  value={row.generic_http_method}
                  onValueChange={(v) => update({ generic_http_method: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Headers (JSON)</Label>
              <Textarea
                rows={3}
                className="font-mono text-xs"
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                placeholder='{ "Content-Type": "application/json" }'
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Body template</Label>
              <Textarea
                rows={4}
                className="font-mono text-xs"
                value={row.generic_body_template}
                onChange={(e) => update({ generic_body_template: e.target.value })}
                placeholder='{"to":"{mobile}","message":"{message}","sender":"{sender}"}'
              />
              <p className="text-xs text-muted-foreground">
                Placeholders: <code className="font-mono">{"{mobile}"}</code>,{" "}
                <code className="font-mono">{"{message}"}</code>,{" "}
                <code className="font-mono">{"{otp}"}</code>,{" "}
                <code className="font-mono">{"{sender}"}</code>.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Add <strong>SMS_GENERIC_AUTH_KEY</strong> in Application Settings → Secrets and reference
              it in the headers as <code className="font-mono">{"{auth_key}"}</code>.
            </p>
          </div>
        )}

        <div className="space-y-3 border-t pt-4">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            Send test OTP
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="tel"
              placeholder="+919876543210 or 9876543210"
              value={testMobile}
              maxLength={20}
              onChange={(e) => setTestMobile(e.target.value)}
              className="sm:max-w-xs"
            />
            <Button
              onClick={sendTestOtp}
              disabled={testing || !row.enabled}
              variant="outline"
              className="gap-2"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send test OTP
            </Button>
          </div>
          {!row.enabled && (
            <p className="text-xs text-muted-foreground">
              Enable the gateway above to send a test message.
            </p>
          )}
          {testResult && (
            <div
              className={`text-sm rounded-md border px-3 py-2 flex gap-2 ${
                testResult.ok
                  ? "border-primary/30 bg-primary/5 text-foreground"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Save your settings first. The test sends a real OTP via the selected provider — standard
            SMS charges apply.
          </p>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-primary" /> Admin-only configuration
          </span>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save SMS settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SMSGatewaySettings;
