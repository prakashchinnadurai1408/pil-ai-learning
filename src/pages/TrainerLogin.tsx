import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Users, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import pluginliveLogo from "@/assets/pluginlive-logo.png";
import { supabase } from "@/integrations/supabase/client";

const TrainerLogin = () => {
  const [step, setStep] = useState<"form" | "sent">("form");
  const [form, setForm] = useState({ name: "", email: "", college: "", location: "", role: "" });

  const handleSendMagicLink = () => {
    if (!form.name || !form.email || !form.college || !form.location || !form.role) {
      toast.error("Please fill all fields");
      return;
    }
    toast.success("Magic link sent to " + form.email);
    setStep("sent");
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative items-center justify-center p-12">
        <div className="relative z-10 max-w-md">
          <img src={pluginliveLogo} alt="PluginLive" className="h-12 mb-8 animate-float" />
          <h2 className="text-3xl font-display font-bold mb-4" style={{ color: "hsl(0, 0%, 95%)" }}>
            Trainer & Coordinator Portal
          </h2>
          <p style={{ color: "hsl(220, 15%, 65%)" }}>
            Monitor student progress, assign training modules, conduct assessments, and manage your institute's AI learning journey.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-accent flex items-center justify-center">
              <Users className="h-5 w-5 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">Trainer Login</h1>
          </div>
          <p className="text-muted-foreground mb-8">Sign in with your email — we'll send a magic link</p>

          {step === "form" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="tname">Full Name</Label>
                <Input id="tname" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@institute.edu" className="pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="tcollege">College Name</Label>
                <Input id="tcollege" placeholder="Enter your college name" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
              </div>
              <div>
                <Label>Location</Label>
                <Select onValueChange={(v) => setForm({ ...form, location: v })}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Role</Label>
                <Select onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trainer">Trainer</SelectItem>
                    <SelectItem value="coordinator">Institute Coordinator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-gradient-accent border-0 text-accent-foreground hover:opacity-90 mt-2" size="lg" onClick={handleSendMagicLink}>
                Send Magic Link
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-2 text-foreground">Check Your Email</h3>
              <p className="text-muted-foreground mb-6">
                We've sent a magic link to <span className="font-medium text-foreground">{form.email}</span>. Click the link to access your dashboard.
              </p>
              <Button variant="outline" onClick={() => setStep("form")}>
                Try another email
              </Button>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Are you a student?{" "}
            <Link to="/student-login" className="text-primary font-medium hover:underline">
              Login as Student
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrainerLogin;
