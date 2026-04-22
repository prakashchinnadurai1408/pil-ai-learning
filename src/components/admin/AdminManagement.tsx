import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, GraduationCap, Building2, ShieldCheck, Search, Clock, Check, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Student = { id: string; name: string; mobile: string; email: string; college: string; location: string; status: string; created_at: string };
type Trainer = { id: string; name: string; mobile: string; email: string; college: string; location: string; status: string; rejection_reason?: string; approved_at?: string | null; created_at: string };
type College = { id: number; name: string; created_at: string };
type AdminUser = { id: string; email: string; created_at: string };

const AdminManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [newCollege, setNewCollege] = useState("");
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<Trainer | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    const [s, t, c, a] = await Promise.all([
      supabase.from("students").select("id,name,mobile,email,college,location,status,created_at").order("created_at", { ascending: false }),
      supabase.from("trainers").select("id,name,mobile,email,college,location,status,rejection_reason,approved_at,created_at").order("created_at", { ascending: false }),
      supabase.from("colleges").select("id,name,created_at").order("name"),
      supabase.from("user_roles").select("user_id,created_at").eq("role", "admin"),
    ]);
    setStudents((s.data ?? []) as Student[]);
    setTrainers((t.data ?? []) as Trainer[]);
    setColleges((c.data ?? []) as College[]);
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

  const approveTrainer = async (t: Trainer) => {
    const { error } = await supabase
      .from("trainers")
      .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: "admin", rejection_reason: "" })
      .eq("id", t.id);
    if (error) { toast.error("Failed to approve"); return; }
    toast.success(`${t.name} approved`);
    load();
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim() || "Not approved by coordinator";
    const { error } = await supabase
      .from("trainers")
      .update({ status: "rejected", rejection_reason: reason, approved_by: "admin" })
      .eq("id", rejectTarget.id);
    if (error) { toast.error("Failed to reject"); return; }
    toast.success(`${rejectTarget.name} rejected`);
    setRejectTarget(null); setRejectReason("");
    load();
  };
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

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="trainers">Trainers</TabsTrigger>
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
      </Tabs>
    </div>
  );
};

export default AdminManagement;
