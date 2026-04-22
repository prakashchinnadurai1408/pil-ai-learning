import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Lock, Mail, KeyRound } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import pluginliveLogo from "@/assets/ai-upskill-hub-logo.png";

const ADMIN_EMAILS = ["prakash.chinnadurai@gmail.com", "prakash_mumbai@yahoo.com"];
const ADMIN_PASSWORD = "Chandra@1408";

type Step = "form" | "otp" | "forgot" | "reset-otp" | "new-password";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState({ password: "", confirm: "" });

  const handleSendOTP = () => {
    if (!form.email || !form.password) { toast.error("Please fill all fields"); return; }
    if (form.email !== ADMIN_EMAIL || form.password !== ADMIN_PASSWORD) {
      toast.error("Invalid admin credentials"); return;
    }
    toast.success("OTP sent to your email");
    setStep("otp");
  };

  const handleVerifyOTP = () => {
    if (otp.length < 4) { toast.error("Enter the complete 4-digit OTP"); return; }
    if (otp !== "1234") { toast.error("Invalid OTP. Please enter 1234"); return; }
    toast.success("Welcome, Admin!");
    navigate("/admin-dashboard");
  };

  const handleForgotSendOTP = () => {
    if (!forgotEmail) { toast.error("Enter your admin email"); return; }
    if (forgotEmail !== ADMIN_EMAIL) { toast.error("Email not recognized"); return; }
    toast.success("OTP sent to " + forgotEmail);
    setOtp("");
    setStep("reset-otp");
  };

  const handleVerifyResetOTP = () => {
    if (otp.length < 4) { toast.error("Enter the complete 4-digit OTP"); return; }
    if (otp !== "1234") { toast.error("Invalid OTP. Please enter 1234"); return; }
    setOtp("");
    setStep("new-password");
  };

  const handleResetPassword = () => {
    if (newPassword.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword.password !== newPassword.confirm) { toast.error("Passwords do not match"); return; }
    toast.success("Password reset successfully! (Demo: password unchanged)");
    setStep("form");
    setNewPassword({ password: "", confirm: "" });
  };

  const subtitle: Record<Step, string> = {
    form: "Sign in with your admin credentials",
    otp: "Enter the OTP sent to your email",
    forgot: "Enter your admin email to reset password",
    "reset-otp": "Enter the OTP sent to your email",
    "new-password": "Set your new password",
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative items-center justify-center p-12">
        <div className="relative z-10 max-w-md">
          <img src={pluginliveLogo} alt="AI Upskill Hub" className="h-12 mb-8 animate-float" />
          <h2 className="text-3xl font-display font-bold mb-4" style={{ color: "hsl(0, 0%, 95%)" }}>Admin Control Center</h2>
          <p style={{ color: "hsl(220, 15%, 65%)" }}>Manage users, create modules with AI, configure subscriptions, and oversee the entire learning platform.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Shield className="h-5 w-5" style={{ color: "hsl(196, 80%, 50%)" }} />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {step === "form" || step === "otp" ? "Admin Login" : "Reset Password"}
            </h1>
          </div>
          <p className="text-muted-foreground mb-8">{subtitle[step]}</p>

          {step === "form" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="admin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="admin-email" type="email" placeholder="Enter admin email" className="pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="admin-password" type="password" placeholder="Enter your password" className="pl-10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <button className="text-sm text-primary hover:underline" onClick={() => setStep("forgot")}>Forgot Password?</button>
              <Button className="w-full bg-gradient-hero border-0 hover:opacity-90 mt-2" size="lg" style={{ color: "hsl(196, 80%, 50%)" }} onClick={handleSendOTP}>
                <Shield className="h-4 w-4 mr-2" /> Send OTP
              </Button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                <Shield className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">OTP sent to <span className="font-medium text-foreground">{form.email}</span></p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                  <InputOTPGroup>{[0, 1, 2, 3].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
                </InputOTP>
              </div>
              <Button className="w-full bg-gradient-hero border-0 hover:opacity-90" size="lg" style={{ color: "hsl(196, 80%, 50%)" }} onClick={handleVerifyOTP}>Verify & Login</Button>
              <button className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => { setStep("form"); setOtp(""); }}>← Back to Login</button>
            </div>
          )}

          {step === "forgot" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="forgot-email">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="forgot-email" type="email" placeholder="Enter admin email" className="pl-10" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                </div>
              </div>
              <Button className="w-full bg-gradient-hero border-0 hover:opacity-90" size="lg" style={{ color: "hsl(196, 80%, 50%)" }} onClick={handleForgotSendOTP}>Send Reset OTP</Button>
              <button className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => setStep("form")}>← Back to Login</button>
            </div>
          )}

          {step === "reset-otp" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                <Shield className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">OTP sent to <span className="font-medium text-foreground">{forgotEmail}</span></p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                  <InputOTPGroup>{[0, 1, 2, 3].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
                </InputOTP>
              </div>
              <Button className="w-full bg-gradient-hero border-0 hover:opacity-90" size="lg" style={{ color: "hsl(196, 80%, 50%)" }} onClick={handleVerifyResetOTP}>Verify OTP</Button>
              <button className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => setStep("forgot")}>← Change Email</button>
            </div>
          )}

          {step === "new-password" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-admin-pass">New Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="new-admin-pass" type="password" placeholder="Min 6 characters" className="pl-10" value={newPassword.password} onChange={(e) => setNewPassword({ ...newPassword, password: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="confirm-admin-pass">Confirm Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirm-admin-pass" type="password" placeholder="Re-enter password" className="pl-10" value={newPassword.confirm} onChange={(e) => setNewPassword({ ...newPassword, confirm: e.target.value })} />
                </div>
              </div>
              <Button className="w-full bg-gradient-hero border-0 hover:opacity-90" size="lg" style={{ color: "hsl(196, 80%, 50%)" }} onClick={handleResetPassword}>Reset Password</Button>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Not an admin?{" "}
            <Link to="/trainer-login" className="text-primary font-medium hover:underline">Login as Trainer</Link>
            {" or "}
            <Link to="/student-login" className="text-primary font-medium hover:underline">Student</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
