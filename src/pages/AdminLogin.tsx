import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Lock, Mail } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import pluginliveLogo from "@/assets/pluginlive-logo.png";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [form, setForm] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState("");

  const handleSendOTP = () => {
    if (!form.email || !form.password) {
      toast.error("Please fill all fields");
      return;
    }
    if (form.email !== "Admin" || form.password !== "Admin@123") {
      toast.error("Invalid admin credentials");
      return;
    }
    toast.success("OTP sent to your email");
    setStep("otp");
  };

  const handleVerifyOTP = () => {
    if (otp.length < 4) {
      toast.error("Enter the complete 4-digit OTP");
      return;
    }
    if (otp !== "1234") {
      toast.error("Invalid OTP. Please enter 1234");
      return;
    }
    toast.success("Welcome, Admin!");
    navigate("/admin-dashboard");
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative items-center justify-center p-12">
        <div className="relative z-10 max-w-md">
          <img src={pluginliveLogo} alt="PluginLive" className="h-12 mb-8 animate-float" />
          <h2 className="text-3xl font-display font-bold mb-4" style={{ color: "hsl(0, 0%, 95%)" }}>
            Admin Control Center
          </h2>
          <p style={{ color: "hsl(220, 15%, 65%)" }}>
            Manage users, create modules with AI, configure subscriptions, and oversee the entire learning platform.
          </p>
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
            <h1 className="text-2xl font-display font-bold text-foreground">Admin Login</h1>
          </div>
          <p className="text-muted-foreground mb-8">
            {step === "form" ? "Sign in with your admin credentials" : "Enter the OTP sent to your email"}
          </p>

          {step === "form" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="admin-email">User ID</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="admin-email" type="text" placeholder="Enter admin user ID" className="pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="admin-password" type="password" placeholder="Enter your password" className="pl-10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <Button className="w-full bg-gradient-hero border-0 hover:opacity-90 mt-2" size="lg" style={{ color: "hsl(196, 80%, 50%)" }} onClick={handleSendOTP}>
                <Shield className="h-4 w-4 mr-2" /> Send OTP
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                <Shield className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">OTP sent to <span className="font-medium text-foreground">{form.email}</span></p>
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
              <Button className="w-full bg-gradient-hero border-0 hover:opacity-90" size="lg" style={{ color: "hsl(196, 80%, 50%)" }} onClick={handleVerifyOTP}>
                Verify & Login
              </Button>
              <button className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => { setStep("form"); setOtp(""); }}>
                ← Back to Login
              </button>
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
