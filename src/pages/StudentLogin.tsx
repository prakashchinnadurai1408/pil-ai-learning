import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, GraduationCap, Phone, Shield, Mail } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import pluginliveLogo from "@/assets/pluginlive-logo.png";
import { supabase } from "@/integrations/supabase/client";

const StudentLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"register" | "otp">("register");
  const [form, setForm] = useState({ name: "", email: "", mobile: "", college: "", location: "" });
  const [otp, setOtp] = useState("");

  const handleSendOTP = async () => {
    if (!form.name || !form.email || !form.mobile || !form.college || !form.location) {
      toast.error("Please fill all fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (form.mobile.length < 10) {
      toast.error("Enter a valid 10-digit mobile number");
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

    // Upsert student record
    const { error } = await supabase.from("students").upsert(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        college: form.college.trim(),
        location: form.location.trim(),
      },
      { onConflict: "mobile" }
    );
    if (error) console.error("Student upsert error:", error);

    sessionStorage.setItem("studentName", form.name);
    sessionStorage.setItem("studentMobile", form.mobile);
    toast.success("Welcome, " + form.name + "!");
    navigate("/student-dashboard");
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative items-center justify-center p-12">
        <div className="relative z-10 max-w-md">
          <img src={pluginliveLogo} alt="PluginLive" className="h-12 mb-8 animate-float" />
          <h2 className="text-3xl font-display font-bold mb-4" style={{ color: "hsl(0, 0%, 95%)" }}>
            Begin Your AI Journey
          </h2>
          <p style={{ color: "hsl(220, 15%, 65%)" }}>
            Join thousands of students mastering AI tools, prompt engineering, and more through our structured learning platform.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {["10 Modules", "50+ Videos", "AI Playground", "Assessments"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "hsl(196, 80%, 60%)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">Student Registration</h1>
          </div>
          <p className="text-muted-foreground mb-8">
            {step === "register" ? "Register with your details to get started" : "Enter the OTP sent to your mobile"}
          </p>

          {step === "register" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Enter your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@example.com" className="pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="mobile">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="mobile" placeholder="10-digit mobile number" className="pl-10" maxLength={10} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })} />
                </div>
              </div>
              <div>
                <Label htmlFor="college">Institute Name</Label>
                <Input id="college" placeholder="Enter your institute name" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="Enter your location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <Button className="w-full bg-gradient-primary border-0 text-primary-foreground hover:opacity-90 mt-2" size="lg" onClick={handleSendOTP}>
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
              <Button className="w-full bg-gradient-primary border-0 text-primary-foreground hover:opacity-90" size="lg" onClick={handleVerifyOTP}>
                Verify & Register
              </Button>
              <button className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => { setStep("register"); setOtp(""); }}>
                ← Change Details
              </button>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Are you a trainer?{" "}
            <Link to="/trainer-login" className="text-primary font-medium hover:underline">
              Login as Trainer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
