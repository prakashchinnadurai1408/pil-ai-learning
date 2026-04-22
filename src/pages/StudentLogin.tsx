import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, GraduationCap, Phone, Shield, Mail, Lock, KeyRound } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import pluginliveLogo from "@/assets/ai-upskill-hub-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useOtpFlow } from "@/hooks/useOtpFlow";

type Step = "register" | "signin" | "otp" | "forgot" | "reset-otp" | "new-password";

const StudentLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("signin");
  const [form, setForm] = useState({ name: "", email: "", mobile: "", college: "", location: "", password: "", degree: "", department: "", age_group: "" });
  const [signinForm, setSigninForm] = useState({ mobile: "", password: "" });
  const [otp, setOtp] = useState("");
  const [forgotMobile, setForgotMobile] = useState("");
  const [newPassword, setNewPassword] = useState({ password: "", confirm: "" });
  const otpFlow = useOtpFlow();

  const issueOtp = () => {
    const r = otpFlow.issueOtp();
    if (!r.ok) { toast.error(r.reason!); return false; }
    setOtp("");
    return true;
  };

  const verifyOtp = (entered: string) => otpFlow.verifyOtp(entered);

  const handleResendOtp = (target: string) => {
    if (issueOtp()) toast.success(`A new OTP was sent to ${target}.`);
  };

  const handleRegisterSendOTP = async () => {
    if (!form.name || !form.email || !form.mobile || !form.college || !form.location || !form.password || !form.age_group) {
      toast.error("Please fill all fields including your age group");
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
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    // Check if mobile already registered
    const { data: existing } = await supabase.from("students").select("id").eq("mobile", form.mobile).maybeSingle();
    if (existing) {
      toast.error("Mobile number already registered. Please sign in.");
      return;
    }
    await supabase.from("locations").upsert({ name: form.location.trim() }, { onConflict: "name" });
    await supabase.from("colleges").upsert({ name: form.college.trim() }, { onConflict: "name" });
    issueOtp();
    toast.success(`OTP sent to ${form.mobile}. Use 1234 (dev mode).`);
    setStep("otp");
  };

  const handleVerifyRegisterOTP = async () => {
    const check = verifyOtp(otp);
    if (!check.ok) { toast.error(check.reason!); return; }
    const { error } = await supabase.from("students").insert({
      name: form.name.trim(), email: form.email.trim(), mobile: form.mobile.trim(),
      college: form.college.trim(), location: form.location.trim(), password: form.password,
      degree: form.degree.trim(), department: form.department.trim(), age_group: form.age_group,
    } as any);
    if (error) { console.error("Candidate insert error:", error); toast.error("Registration failed"); return; }
    sessionStorage.setItem("studentName", form.name);
    sessionStorage.setItem("studentMobile", form.mobile);
    sessionStorage.setItem("studentCollege", form.college);
    sessionStorage.setItem("studentDegree", form.degree);
    sessionStorage.setItem("studentDepartment", form.department);
    sessionStorage.setItem("studentAgeGroup", form.age_group || "");
    toast.success("Welcome, " + form.name + "!");
    navigate("/student-dashboard");
  };

  const handleSignIn = async () => {
    if (!signinForm.mobile || !signinForm.password) { toast.error("Please fill all fields"); return; }
    const { data, error } = await supabase.from("students").select("*").eq("mobile", signinForm.mobile).eq("password", signinForm.password).maybeSingle();
    if (error || !data) { toast.error("Invalid mobile number or password"); return; }
    if (((data as any).status ?? "active") === "inactive") { toast.error("Your account is inactive. Please contact admin."); return; }
    sessionStorage.setItem("studentName", data.name);
    sessionStorage.setItem("studentMobile", data.mobile);
    sessionStorage.setItem("studentCollege", data.college);
    sessionStorage.setItem("studentDegree", (data as any).degree || "");
    sessionStorage.setItem("studentDepartment", (data as any).department || "");
    sessionStorage.setItem("studentAgeGroup", (data as any).age_group || "");
    sessionStorage.setItem("studentId", data.id);
    toast.success("Welcome back, " + data.name + "!");
    navigate("/student-dashboard");
  };

  const handleForgotSendOTP = async () => {
    if (forgotMobile.length < 10) { toast.error("Enter a valid 10-digit mobile number"); return; }
    const { data } = await supabase.from("students").select("id").eq("mobile", forgotMobile).maybeSingle();
    if (!data) { toast.error("Mobile number not registered"); return; }
    issueOtp();
    toast.success(`OTP sent to ${forgotMobile}. Use 1234 (dev mode).`);
    setStep("reset-otp");
  };

  const handleVerifyResetOTP = () => {
    const check = verifyOtp(otp);
    if (!check.ok) { toast.error(check.reason!); return; }
    toast.success("OTP verified");
    setOtp("");
    setStep("new-password");
  };

  const handleResetPassword = async () => {
    if (newPassword.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword.password !== newPassword.confirm) { toast.error("Passwords do not match"); return; }
    const { error } = await supabase.from("students").update({ password: newPassword.password }).eq("mobile", forgotMobile);
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
          <img src={pluginliveLogo} alt="AI Upskill Hub" className="h-12 mb-8 animate-float" />
          <h2 className="text-3xl font-display font-bold mb-4" style={{ color: "hsl(0, 0%, 95%)" }}>Begin Your AI Journey</h2>
          <p style={{ color: "hsl(220, 15%, 65%)" }}>Join thousands of students mastering AI tools, prompt engineering, and more through our structured learning platform.</p>
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
            <h1 className="text-2xl font-display font-bold text-foreground">
              {step === "register" || step === "otp" ? "Candidate Registration" : step === "signin" ? "Candidate Sign In" : "Reset Password"}
            </h1>
          </div>
          <p className="text-muted-foreground mb-8">{subtitle[step]}</p>

          {step === "signin" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="s-mobile">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="s-mobile" placeholder="10-digit mobile number" className="pl-10" maxLength={10} value={signinForm.mobile} onChange={(e) => setSigninForm({ ...signinForm, mobile: e.target.value.replace(/\D/g, "") })} />
                </div>
              </div>
              <div>
                <Label htmlFor="s-pass">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="s-pass" type="password" placeholder="Enter your password" className="pl-10" value={signinForm.password} onChange={(e) => setSigninForm({ ...signinForm, password: e.target.value })} />
                </div>
              </div>
              <button className="text-sm text-primary hover:underline" onClick={() => setStep("forgot")}>Forgot Password?</button>
              <Button className="w-full bg-gradient-primary border-0 text-primary-foreground hover:opacity-90 mt-2" size="lg" onClick={handleSignIn}>Sign In</Button>
              <p className="text-center text-sm text-muted-foreground">Don't have an account?{" "}
                <button className="text-primary font-medium hover:underline" onClick={() => setStep("register")}>Register</button>
              </p>
            </div>
          )}

          {step === "register" && (
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="degree">Degree</Label>
                  <Input id="degree" placeholder="e.g., B.Tech, M.Sc" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" placeholder="e.g., CSE, ECE" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="age_group">Your Age Group</Label>
                <Select value={form.age_group} onValueChange={(v) => setForm({ ...form, age_group: v })}>
                  <SelectTrigger id="age_group"><SelectValue placeholder="Select your age group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10-14">10–14 years</SelectItem>
                    <SelectItem value="15-18">15–18 years</SelectItem>
                    <SelectItem value="19-22">19–22 years</SelectItem>
                    <SelectItem value="23+">23+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="Create a password (min 6 chars)" className="pl-10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <Button className="w-full bg-gradient-primary border-0 text-primary-foreground hover:opacity-90 mt-2" size="lg" onClick={handleRegisterSendOTP}>Send OTP</Button>
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
              <div className="flex justify-center">
                <button type="button" disabled={otpFlow.cooldownLeft > 0} onClick={() => handleResendOtp(form.mobile)} className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">
                  {otpFlow.cooldownLeft > 0 ? `Resend in ${otpFlow.cooldownLeft}s` : "Resend OTP"}
                </button>
              </div>
              <Button className="w-full bg-gradient-primary border-0 text-primary-foreground hover:opacity-90" size="lg" onClick={handleVerifyRegisterOTP}>Verify & Register</Button>
              <button className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => { setStep("register"); setOtp(""); otpFlow.reset(); }}>← Change Details</button>
            </div>
          )}

          {step === "forgot" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="forgot-mobile">Registered Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="forgot-mobile" placeholder="10-digit mobile number" className="pl-10" maxLength={10} value={forgotMobile} onChange={(e) => setForgotMobile(e.target.value.replace(/\D/g, ""))} />
                </div>
              </div>
              <Button className="w-full bg-gradient-primary border-0 text-primary-foreground hover:opacity-90" size="lg" onClick={handleForgotSendOTP}>Send Reset OTP</Button>
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
              <div className="flex justify-center">
                <button type="button" disabled={otpFlow.cooldownLeft > 0} onClick={() => handleResendOtp(forgotMobile)} className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">
                  {otpFlow.cooldownLeft > 0 ? `Resend in ${otpFlow.cooldownLeft}s` : "Resend OTP"}
                </button>
              </div>
              <Button className="w-full bg-gradient-primary border-0 text-primary-foreground hover:opacity-90" size="lg" onClick={handleVerifyResetOTP}>Verify OTP</Button>
              <button className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => setStep("forgot")}>← Change Number</button>
            </div>
          )}

          {step === "new-password" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-pass">New Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="new-pass" type="password" placeholder="Min 6 characters" className="pl-10" value={newPassword.password} onChange={(e) => setNewPassword({ ...newPassword, password: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="confirm-pass">Confirm Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirm-pass" type="password" placeholder="Re-enter password" className="pl-10" value={newPassword.confirm} onChange={(e) => setNewPassword({ ...newPassword, confirm: e.target.value })} />
                </div>
              </div>
              <Button className="w-full bg-gradient-primary border-0 text-primary-foreground hover:opacity-90" size="lg" onClick={handleResetPassword}>Reset Password</Button>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Are you a trainer?{" "}
            <Link to="/trainer-login" className="text-primary font-medium hover:underline">Login as Trainer</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
