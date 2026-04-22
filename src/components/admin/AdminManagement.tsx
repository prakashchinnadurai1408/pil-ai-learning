import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, GraduationCap, Building2, ShieldCheck, Search, Clock, Check, X, History } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useUserRole } from "@/hooks/useUserRole";
import { Lock } from "lucide-react";

type Student = { id: string; name: string; mobile: string; email: string; college: string; location: string; status: string; created_at: string };
type Trainer = { id: string; name: string; mobile: string; email: string; college: string; location: string; status: string; rejection_reason?: string; approved_at?: string | null; created_at: string };
type College = { id: number; name: string; created_at: string };
type AdminUser = { id: string; email: string; created_at: string };
type ActivityLog = { id: string; trainer_id: string; trainer_name: string; action: string; reason: string; actor_name: string; created_at: string };

// Reason codes for the multi-step approval workflow.
// Stored in trainer_activity_log.reason as a single string formatted as
// "<code label>: <reviewer note>" so existing readers stay backward-compatible.
const APPROVE_REASON_CODES = [
  { code: "verified_credentials", label: "Verified credentials & college affiliation" },
  { code: "trusted_referrer", label: "Referred by an approved trainer/admin" },
  { code: "pilot_program", label: "Pilot program / paid cohort" },
  { code: "other_approve", label: "Other (explain in notes)" },
];
const REJECT_REASON_CODES = [
  { code: "unverified_college", label: "College not affiliated / cannot verify" },
  { code: "incomplete_profile", label: "Incomplete or invalid profile details" },
  { code: "duplicate_account", label: "Duplicate or suspicious account" },
  { code: "policy_violation", label: "Violates platform policy" },
  { code: "other_reject", label: "Other (explain in notes)" },
];

type ReviewStep = "choose" | "details" | "confirm";
type ReviewMode = "approve" | "reject";
interface ReviewState {
  trainer: Trainer;
  mode: ReviewMode;
  step: ReviewStep;
  codeLabel: string;
  notes: string;
}

const AdminManagement = () => {
  const { isAdmin, isCoordinator, loading: roleLoading } = useUserRole();
  const [students, setStudents] = useState<Student[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState("");
  const [newCollege, setNewCollege] = useState("");
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityFrom, setActivityFrom] = useState("");
  const [activityTo, setActivityTo] = useState("");

  const load = async () => {
    setLoading(true);
    const [s, t, c, a, log] = await Promise.all([
      supabase.from("students").select("id,name,mobile,email,college,location,status,created_at").order("created_at", { ascending: false }),
      supabase.from("trainers").select("id,name,mobile,email,college,location,status,rejection_reason,approved_at,created_at").order("created_at", { ascending: false }),
      supabase.from("colleges").select("id,name,created_at").order("name"),
      supabase.from("user_roles").select("user_id,created_at").eq("role", "admin"),
      supabase.from("trainer_activity_log").select("id,trainer_id,trainer_name,action,reason,actor_name,created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    setStudents((s.data ?? []) as Student[]);
    setTrainers((t.data ?? []) as Trainer[]);
    setColleges((c.data ?? []) as College[]);
    setActivity((log.data ?? []) as ActivityLog[]);
    // We can't read auth.users from the client; show user_id + assignment date.
    setAdmins(((a.data ?? []) as any[]).map((r) => ({ id: r.user_id, email: r.user_id.slice(0, 8) + "…", created_at: r.created_at })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleStudentStatus = async (id: string, current: string) => {
    const next = current === "inactive" ? "active" : "inactive";
    const { error } = await supabase.from("students").update({ status: next }).eq("id", id);
    if (error) { toast.error("Failed to update status"); return; }
    toast.success(`Student marked ${next}`);
    load();
  };

  const addCollege = async () => {
    const name = newCollege.trim();
    if (!name) return;
    const { error } = await supabase.from("colleges").upsert({ name }, { onConflict: "name" });
    if (error) { toast.error("Failed to add college"); return; }
    toast.success("College added");
    setNewCollege("");
    load();
  };

  const logActivity = async (trainer: Trainer, action: "approved" | "rejected" | "re-approved", reason: string) => {
    await supabase.from("trainer_activity_log").insert({
      trainer_id: trainer.id,
      trainer_name: trainer.name,
      action,
      reason,
      actor_id: "admin",
      actor_name: "Admin",
    });
  };

  // Open the multi-step review dialog. The flow is: choose reason code → add notes → confirm.
  const startReview = (trainer: Trainer, mode: ReviewMode) => {
    if (!isAdmin) { toast.error(`Only admins can ${mode === "approve" ? "approve" : "reject"} trainers`); return; }
    setReview({ trainer, mode, step: "choose", codeLabel: "", notes: "" });
  };

  const submitReview = async () => {
    if (!review) return;
    if (!isAdmin) { toast.error("Admin role required"); return; }
    const { trainer, mode, codeLabel, notes } = review;
    const note = notes.trim();
    // Persist the structured reason+note so the activity log stays human-readable.
    const reason = note ? `${codeLabel}: ${note}` : codeLabel;
    setSubmittingReview(true);
    try {
      if (mode === "approve") {
        const wasRejected = trainer.status === "rejected";
        const { error } = await supabase
          .from("trainers")
          .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: "admin", rejection_reason: "" })
          .eq("id", trainer.id);
        if (error) { toast.error("Failed to approve"); return; }
        await logActivity(trainer, wasRejected ? "re-approved" : "approved", reason);
        toast.success(`${trainer.name} approved`);
      } else {
        const { error } = await supabase
          .from("trainers")
          .update({ status: "rejected", rejection_reason: reason, approved_by: "admin" })
          .eq("id", trainer.id);
        if (error) { toast.error("Failed to reject"); return; }
        await logActivity(trainer, "rejected", reason);
        toast.success(`${trainer.name} rejected`);
      }
      setReview(null);
      load();
    } finally {
      setSubmittingReview(false);
    }
  };

  const filtered = <T extends { name: string; mobile?: string; email?: string }>(arr: T[]) =>
    arr.filter((r) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return [r.name, r.mobile ?? "", r.email ?? ""].some((v) => v.toLowerCase().includes(q));
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Management</h2>
          <p className="text-muted-foreground">Students, trainers, colleges & login status</p>
        </div>
      </div>

      {!roleLoading && isCoordinator && (
        <div className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-sm flex items-center gap-2">
          <Lock className="h-4 w-4 text-warning" />
          <span><strong>Coordinator view</strong> — you can review trainer progress, but only admins can approve or reject trainers.</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><GraduationCap className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{students.length}</div><div className="text-xs text-muted-foreground">Students</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Users className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{trainers.length}</div><div className="text-xs text-muted-foreground">Trainers</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Building2 className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{colleges.length}</div><div className="text-xs text-muted-foreground">Colleges</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{admins.length}</div><div className="text-xs text-muted-foreground">Admins</div></div></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, mobile, or email…" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {(() => {
        const pendingCount = trainers.filter((t) => (t.status || "pending") === "pending").length;
        return (
      <Tabs defaultValue={pendingCount > 0 ? "pending-trainers" : "students"}>
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="trainers">Trainers</TabsTrigger>
          <TabsTrigger value="pending-trainers" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Pending Trainers
            {pendingCount > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="colleges">Colleges</TabsTrigger>
          <TabsTrigger value="admins">Admins & Login Status</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader><CardTitle>Registered Students</CardTitle></CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Mobile</TableHead><TableHead>College</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filtered(students).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.mobile}</TableCell>
                        <TableCell>{s.college}</TableCell>
                        <TableCell>{s.location}</TableCell>
                        <TableCell><Badge variant={s.status === "inactive" ? "destructive" : "default"}>{s.status || "active"}</Badge></TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => toggleStudentStatus(s.id, s.status || "active")}>
                            {s.status === "inactive" ? "Activate" : "Deactivate"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!filtered(students).length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No students found</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trainers">
          <Card>
            <CardHeader><CardTitle>Registered Trainers</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Mobile</TableHead><TableHead>Email</TableHead><TableHead>College</TableHead><TableHead>Location</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered(trainers).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.mobile}</TableCell>
                      <TableCell>{t.email}</TableCell>
                      <TableCell>{t.college}</TableCell>
                      <TableCell>{t.location}</TableCell>
                    </TableRow>
                  ))}
                  {!filtered(trainers).length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No trainers found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colleges">
          <Card>
            <CardHeader><CardTitle>Colleges</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 max-w-md">
                <Input placeholder="Add new college name" value={newCollege} onChange={(e) => setNewCollege(e.target.value)} />
                <Button onClick={addCollege}>Add</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Added</TableHead></TableRow></TableHeader>
                <TableBody>
                  {colleges.map((c) => (
                    <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell></TableRow>
                  ))}
                  {!colleges.length && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No colleges yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle>Admin Accounts & Login Status</CardTitle>
              <p className="text-sm text-muted-foreground">
                Admins authenticate via Supabase Auth + the dev OTP (1234). All admin accounts shown below have the <code>admin</code> role assigned.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Admin User ID</TableHead><TableHead>Role Granted</TableHead></TableRow></TableHeader>
                <TableBody>
                  {admins.map((a) => (
                    <TableRow key={a.id}><TableCell className="font-mono text-xs">{a.id}</TableCell><TableCell>{new Date(a.created_at).toLocaleString()}</TableCell></TableRow>
                  ))}
                  {!admins.length && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No admins assigned yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending-trainers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-warning" /> Trainers awaiting approval</CardTitle>
              <p className="text-sm text-muted-foreground">Approve or reject newly registered trainers. Approved trainers can immediately access the trainer dashboard; rejected trainers see a message with your reason.</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Mobile</TableHead><TableHead>College</TableHead><TableHead>Location</TableHead><TableHead>Registered</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {trainers.filter((t) => (t.status || "pending") === "pending").map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.email}</TableCell>
                      <TableCell>{t.mobile}</TableCell>
                      <TableCell>{t.college}</TableCell>
                      <TableCell>{t.location}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" onClick={() => startReview(t, "approve")} disabled={!isAdmin} title={!isAdmin ? "Admin only" : undefined} className="gap-1.5"><Check className="h-3.5 w-3.5" /> Approve…</Button>
                        <Button size="sm" variant="outline" onClick={() => startReview(t, "reject")} disabled={!isAdmin} title={!isAdmin ? "Admin only" : undefined} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"><X className="h-3.5 w-3.5" /> Reject…</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!trainers.filter((t) => (t.status || "pending") === "pending").length && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No trainers waiting for approval 🎉</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              {trainers.filter((t) => t.status === "rejected").length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Recently rejected</h4>
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {trainers.filter((t) => t.status === "rejected").map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.name}</TableCell>
                          <TableCell>{t.email}</TableCell>
                          <TableCell className="text-xs text-destructive">{t.rejection_reason || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => startReview(t, "approve")} disabled={!isAdmin} title={!isAdmin ? "Admin only" : undefined} className="gap-1.5"><Check className="h-3.5 w-3.5" /> Approve…</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <History className="h-4 w-4" /> Approval activity log
                </h4>
                <p className="text-xs text-muted-foreground">Every approve/reject action is recorded here for audit.</p>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search trainer name…" className="pl-9 h-9" value={activitySearch} onChange={(e) => setActivitySearch(e.target.value)} />
                  </div>
                  <div className="flex gap-2 items-center">
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-muted-foreground">From</label>
                      <Input type="date" className="h-9" value={activityFrom} onChange={(e) => setActivityFrom(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-muted-foreground">To</label>
                      <Input type="date" className="h-9" value={activityTo} onChange={(e) => setActivityTo(e.target.value)} />
                    </div>
                    {(activitySearch || activityFrom || activityTo) && (
                      <Button variant="ghost" size="sm" className="h-9" onClick={() => { setActivitySearch(""); setActivityFrom(""); setActivityTo(""); }}>Clear</Button>
                    )}
                  </div>
                </div>
                {(() => {
                  const q = activitySearch.toLowerCase().trim();
                  const fromTs = activityFrom ? new Date(activityFrom + "T00:00:00").getTime() : null;
                  const toTs = activityTo ? new Date(activityTo + "T23:59:59").getTime() : null;
                  const filteredActivity = activity.filter((row) => {
                    if (q && !row.trainer_name.toLowerCase().includes(q)) return false;
                    const ts = new Date(row.created_at).getTime();
                    if (fromTs && ts < fromTs) return false;
                    if (toTs && ts > toTs) return false;
                    return true;
                  });
                  return (
                <Table>
                  <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Trainer</TableHead><TableHead>Action</TableHead><TableHead>By</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredActivity.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{row.trainer_name}</TableCell>
                        <TableCell>
                          <Badge variant={row.action === "rejected" ? "destructive" : "default"} className="capitalize">{row.action}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{row.actor_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.reason || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {!filteredActivity.length && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">{activity.length ? "No matches for current filters." : "No approval actions yet."}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        );
      })()}

      {/* Multi-step approval/rejection workflow:
          1. choose  — pick a structured reason code (radio list)
          2. details — free-form reviewer note (optional for approve, recommended for reject)
          3. confirm — full preview of what will be saved + sent to the trainer */}
      <Dialog open={!!review} onOpenChange={(o) => { if (!o && !submittingReview) setReview(null); }}>
        <DialogContent className="max-w-lg">
          {review && (() => {
            const isApprove = review.mode === "approve";
            const codes = isApprove ? APPROVE_REASON_CODES : REJECT_REASON_CODES;
            const stepNumber = review.step === "choose" ? 1 : review.step === "details" ? 2 : 3;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {isApprove ? <Check className="h-5 w-5 text-success" /> : <X className="h-5 w-5 text-destructive" />}
                    {isApprove ? "Approve" : "Reject"} {review.trainer.name}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">Step {stepNumber} of 3 · {review.trainer.email} · {review.trainer.college || "no college"}</p>
                </DialogHeader>

                {review.step === "choose" && (
                  <div className="space-y-3">
                    <p className="text-sm">Pick the primary reason for this decision. The reason is recorded in the activity log and shown to the trainer.</p>
                    <div className="space-y-2">
                      {codes.map((c) => (
                        <label key={c.code} className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${review.codeLabel === c.label ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                          <input
                            type="radio"
                            name="reason-code"
                            checked={review.codeLabel === c.label}
                            onChange={() => setReview({ ...review, codeLabel: c.label })}
                            className="mt-1 accent-primary"
                          />
                          <span className="text-sm">{c.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {review.step === "details" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reviewer notes {isApprove ? "(optional)" : "(strongly recommended)"}</label>
                    <p className="text-xs text-muted-foreground">Add context the trainer should see — e.g., next steps, what was missing, or who verified them.</p>
                    <Textarea
                      placeholder={isApprove ? "e.g., Verified via official college email; please complete onboarding." : "e.g., We couldn't verify your college email — please re-register from your @college.edu address."}
                      value={review.notes}
                      onChange={(e) => setReview({ ...review, notes: e.target.value })}
                      rows={4}
                    />
                    <p className="text-[11px] text-muted-foreground">Selected reason: <span className="font-medium">{review.codeLabel}</span></p>
                  </div>
                )}

                {review.step === "confirm" && (
                  <div className="space-y-3 text-sm">
                    <div className="rounded-md border border-border p-3 space-y-1.5 bg-muted/30">
                      <p><span className="text-muted-foreground">Decision:</span> <Badge variant={isApprove ? "default" : "destructive"} className="capitalize">{isApprove ? (review.trainer.status === "rejected" ? "re-approve" : "approve") : "reject"}</Badge></p>
                      <p><span className="text-muted-foreground">Reason code:</span> {review.codeLabel}</p>
                      <p><span className="text-muted-foreground">Notes:</span> {review.notes.trim() || <em className="text-muted-foreground">none</em>}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isApprove
                        ? "The trainer will be able to log in immediately. The reason and notes are saved to the activity log for audit."
                        : "The trainer will see this reason and notes on their next login attempt. They can re-register or contact you."}
                    </p>
                  </div>
                )}

                <DialogFooter className="gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (review.step === "choose") setReview(null);
                      else if (review.step === "details") setReview({ ...review, step: "choose" });
                      else setReview({ ...review, step: "details" });
                    }}
                    disabled={submittingReview}
                  >
                    {review.step === "choose" ? "Cancel" : "Back"}
                  </Button>
                  {review.step !== "confirm" ? (
                    <Button
                      onClick={() => setReview({ ...review, step: review.step === "choose" ? "details" : "confirm" })}
                      disabled={review.step === "choose" && !review.codeLabel}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      variant={isApprove ? "default" : "destructive"}
                      onClick={submitReview}
                      disabled={submittingReview}
                    >
                      {submittingReview ? "Saving…" : `Confirm ${isApprove ? "approve" : "reject"}`}
                    </Button>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminManagement;
