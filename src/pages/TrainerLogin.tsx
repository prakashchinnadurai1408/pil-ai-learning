import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Users, Phone, Shield, Lock, KeyRound } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import pluginliveLogo from "@/assets/pluginlive-logo.png";
import { supabase } from "@/integrations/supabase/client";

type Step = "register" | "signin" | "otp" | "forgot" | "reset-otp" | "new-password";

const TrainerLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("signin");
  const [form, setForm] = useState({ name: "", email: "", college: "", location: "", mobile: "", password: "" });
  const [signinForm, setSigninForm] = useState({ mobile: "", password: "" });
  const [otp, setOtp] = useState("");
  const [forgotMobile, setForgotMobile] = useState("");
  const [newPassword, setNewPassword] = useState({ password: "", confirm: "" });

  const handleRegisterSendOTP = async () => {
    if (!form.name || !form.email || !form.college || !form.location || !form.mobile || !form.password) {
      toast.error("Please fill all fields"); return;
    }
    if (form.mobile.length < 10) { toast.error("Enter a valid 10-digit mobile number"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("Enter a valid email address"); return; }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    const { data: existing } = await supabase.from("trainers").select("id").eq("mobile", form.mobile).maybeSingle();
    if (existing) { toast.error("Mobile number already registered. Please sign in."); return; }
    await supabase.from("locations").upsert({ name: form.location.trim() }, { onConflict: "name" });
    await supabase.from("colleges").upsert({ name: form.college.trim() }, { onConflict: "name" });
    toast.success("OTP sent to " + form.mobile);
    setStep("otp");
  };

  const handleVerifyRegisterOTP = async () => {
    if (otp.length < 4) { toast.error("Enter the complete 4-digit OTP"); return; }
    if (otp !== "1234") { toast.error("Invalid OTP. Please enter 1234"); return; }
    const { error } = await supabase.from("trainers").insert({
      name: form.name.trim(), email: form.email.trim(), mobile: form.mobile.trim(),
      college: form.college.trim(), location: form.location.trim(), password: form.password,
    });
    if (error) { console.error("Trainer insert error:", error); toast.error("Registration failed"); return; }
    sessionStorage.setItem("trainerName", form.name);
    sessionStorage.setItem("trainerEmail", form.email);
    toast.success("Welcome, " + form.name + "!");
    navigate("/trainer-dashboard");
  };

  const handleSignIn = async () => {
    if (!signinForm.mobile || !signinForm.password) { toast.error("Please fill all fields"); return; }
    const { data, error } = await supabase.from("trainers").select("*").eq("mobile", signinForm.mobile).eq("password", signinForm.password).maybeSingle();
    if (error || !data) { toast.error("Invalid mobile number or password"); return; }
    sessionStorage.setItem("trainerName", data.name);
    sessionStorage.setItem("trainerEmail", data.email);
    toast.success("Welcome back, " + data.name + "!");
    navigate("/trainer-dashboard");
  };

  const handleForgotSendOTP = async () => {
    if (forgotMobile.length < 10) { toast.error("Enter a valid 10-digit mobile number"); return; }
    const { data } = await supabase.from("trainers").select("id").eq("mobile", forgotMobile).maybeSingle();
    if (!data) { toast.error("Mobile number not registered"); return; }
    toast.success("OTP sent to " + forgotMobile);
    setOtp("");
    setStep("reset-otp");
  };

  const handleVerifyResetOTP = () => {
    if (otp.length < 4) { toast.error("Enter the complete 4-digit OTP"); return; }
    if (otp !== "1234") { toast.error("Invalid OTP. Please enter 1234"); return; }
    setOtp("");
    setStep("new-password");
  };

  const handleResetPassword = async () => {
    if (newPassword.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword.password !== newPassword.confirm) { toast.error("Passwords do not match"); return; }
    const { error } = await supabase.from("trainers").update({ password: newPassword.password }).eq("mobile", forgotMobile);
    if (error) { toast.error("Failed to reset password"); return; }
    toast.success("Password reset successfully! Please sign in.");
    setStep("signin");
    setNewPassword({ password: "", confirm: "" });
  };

  const subtitle: Record<Step, string> = {
    signin: "Sign in with your credentials",
    register: "Register with your details to get started",
    otp: "Enter the OTP sent to your mobile",
    forgot: "Enter your registered mobile number",
    "reset-otp": "Enter the OTP sent to your mobile",
    "new-password": "Set your new password",
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative items-center justify-center p-12">
        <div className="relative z-10 max-w-md">
          <img src={pluginliveLogo} alt="PluginLive" className="h-12 mb-8 animate-float" />
          <h2 className="text-3xl font-display font-bold mb-4" style={{ color: "hsl(0, 0%, 95%)" }}>Trainer & Coordinator Portal</h2>
          <p style={{ color: "hsl(220, 15%, 65%)" }}>Monitor student progress, assign training modules, conduct assessments, and manage your institute's AI learning journey.</p>
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
            <h1 className="text-2xl font-display font-bold text-foreground">
              {step === "register" || step === "otp" ? "Trainer Registration" : step === "signin" ? "Trainer Sign In" : "Reset Password"}
            </h1>
          </div>
          <p className="text-muted-foreground mb-8">{subtitle[step]}</p>

          {step === "signin" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="t-mobile">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="t-mobile" placeholder="10-digit mobile number" className="pl-10" maxLength={10} value={signinForm.mobile} onChange={(e) => setSigninForm({ ...signinForm, mobile: e.target.value.replace(/\D/g, "") })} />
                </div>
              </div>
              <div>
                <Label htmlFor="t-pass">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="t-pass" type="password" placeholder="Enter your password" className="pl-10" value={signinForm.password} onChange={(e) => setSigninForm({ ...signinForm, password: e.target.value })} />
                </div>
              </div>
              <button className="text-sm text-primary hover:underline" onClick={() => setStep("forgot")}>Forgot Password?</button>
              <Button className="w-full bg-gradient-accent border-0 text-accent-foreground hover:opacity-90 mt-2" size="lg" onClick={handleSignIn}>Sign In</Button>
              <p className="text-center text-sm text-muted-foreground">Don't have an account?{" "}
                <button className="text-primary font-medium hover:underline" onClick={() => setStep("register")}>Register</button>
              </p>
            </div>
          )}

          {step === "register" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="tname">Full Name</Label>
                <Input id="tname" placeholder="Enter your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="temail">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="temail" type="email" placeholder="you@institute.edu" className="pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
              <div>
                <Label htmlFor="tpassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="tpassword" type="password" placeholder="Create a password (min 6 chars)" className="pl-10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <Button className="w-full bg-gradient-accent border-0 text-accent-foreground hover:opacity-90 mt-2" size="lg" onClick={handleRegisterSendOTP}>Send OTP</Button>
              <p className="text-center text-sm text-muted-foreground">Already have an account?{" "}
                <button className="text-primary font-medium hover:underline" onClick={() => setStep("signin")}>Sign In</button>
              </p>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                <Shield className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">OTP sent to <span className="font-medium text-foreground">{form.mobile}</span></p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                  <InputOTPGroup>{[0, 1, 2, 3].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
                </InputOTP>
              </div>
              <Button className="w-full bg-gradient-accent border-0 text-accent-foreground hover:opacity-90" size="lg" onClick={handleVerifyRegisterOTP}>Verify & Register</Button>
              <button className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => { setStep("register"); setOtp(""); }}>← Change Details</button>
            </div>
          )}

          {step === "forgot" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="forgot-t-mobile">Registered Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="forgot-t-mobile" placeholder="10-digit mobile number" className="pl-10" maxLength={10} value={forgotMobile} onChange={(e) => setForgotMobile(e.target.value.replace(/\D/g, ""))} />
                </div>
              </div>
              <Button className="w-full bg-gradient-accent border-0 text-accent-foreground hover:opacity-90" size="lg" onClick={handleForgotSendOTP}>Send Reset OTP</Button>
              <button className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => setStep("signin")}>← Back to Sign In</button>
            </div>
          )}

          {step === "reset-otp" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                <Shield className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">OTP sent to <span className="font-medium text-foreground">{forgotMobile}</span></p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                  <InputOTPGroup>{[0, 1, 2, 3].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
                </InputOTP>
              </div>
              <Button className="w-full bg-gradient-accent border-0 text-accent-foreground hover:opacity-90" size="lg" onClick={handleVerifyResetOTP}>Verify OTP</Button>
              <button className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => setStep("forgot")}>← Change Number</button>
            </div>
          )}

          {step === "new-password" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-t-pass">New Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="new-t-pass" type="password" placeholder="Min 6 characters" className="pl-10" value={newPassword.password} onChange={(e) => setNewPassword({ ...newPassword, password: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="confirm-t-pass">Confirm Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirm-t-pass" type="password" placeholder="Re-enter password" className="pl-10" value={newPassword.confirm} onChange={(e) => setNewPassword({ ...newPassword, confirm: e.target.value })} />
                </div>
              </div>
              <Button className="w-full bg-gradient-accent border-0 text-accent-foreground hover:opacity-90" size="lg" onClick={handleResetPassword}>Reset Password</Button>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Are you a student?{" "}
            <Link to="/student-login" className="text-primary font-medium hover:underline">Login as Student</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrainerLogin;
