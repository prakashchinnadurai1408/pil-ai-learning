import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Users, CheckCircle, Phone, Shield } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import pluginliveLogo from "@/assets/pluginlive-logo.png";
import { supabase } from "@/integrations/supabase/client";

const TrainerLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [form, setForm] = useState({ name: "", email: "", college: "", location: "", mobile: "" });
  const [otp, setOtp] = useState("");

  const handleSendOTP = async () => {
    if (!form.name || !form.email || !form.college || !form.location || !form.mobile) {
      toast.error("Please fill all fields");
      return;
    }
    if (form.mobile.length < 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Enter a valid email address");
      return;
    }

    await supabase.from("locations").upsert({ name: form.location.trim() }, { onConflict: "name" });
    await supabase.from("colleges").upsert({ name: form.college.trim() }, { onConflict: "name" });

    toast.success("OTP sent to " + form.mobile);
    setStep("otp");
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 4) {
      toast.error("Enter the complete 4-digit OTP");
      return;
    }
    if (otp !== "1234") {
      toast.error("Invalid OTP. Please enter 1234");
      return;
    }
    sessionStorage.setItem("trainerName", form.name);
    sessionStorage.setItem("trainerEmail", form.email);
    toast.success("Welcome, " + form.name + "!");
    navigate("/trainer-dashboard");
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
          <p className="text-muted-foreground mb-8">
            {step === "form" ? "Register with your details to get started" : "Enter the OTP sent to your mobile"}
          </p>

          {step === "form" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="tname">Full Name</Label>
                <Input id="tname" placeholder="Enter your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@institute.edu" className="pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="tcollege">Institute Name</Label>
                <Input id="tcollege" placeholder="Enter your institute name" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="tlocation">Location</Label>
                <Input id="tlocation" placeholder="Enter your location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="tmobile">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="tmobile" placeholder="10-digit mobile number" className="pl-10" maxLength={10} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })} />
                </div>
              </div>
              <Button className="w-full bg-gradient-accent border-0 text-accent-foreground hover:opacity-90 mt-2" size="lg" onClick={handleSendOTP}>
                Send OTP
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                <Shield className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">OTP sent to <span className="font-medium text-foreground">{form.mobile}</span></p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button className="w-full bg-gradient-accent border-0 text-accent-foreground hover:opacity-90" size="lg" onClick={handleVerifyOTP}>
                Verify & Login
              </Button>
              <button className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => { setStep("form"); setOtp(""); }}>
                ← Change Number
              </button>
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
