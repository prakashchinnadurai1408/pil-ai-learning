import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, GraduationCap, Phone, Shield } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import pluginliveLogo from "@/assets/pluginlive-logo.png";

const locations = [
  "Mumbai", "Delhi", "Chennai", "Bangalore", "Hyderabad",
  "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Other"
];

const StudentLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"register" | "otp">("register");
  const [form, setForm] = useState({ name: "", mobile: "", college: "", location: "" });
  const [otp, setOtp] = useState("");

  const handleSendOTP = () => {
    if (!form.name || !form.mobile || !form.college || !form.location) {
      toast.error("Please fill all fields");
      return;
    }
    if (form.mobile.length < 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    toast.success("OTP sent to " + form.mobile);
    setStep("otp");
  };

  const handleVerifyOTP = () => {
    if (otp.length < 6) {
      toast.error("Enter the complete 6-digit OTP");
      return;
    }
    toast.success("Welcome, " + form.name + "!");
    navigate("/student-dashboard");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
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

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">Student Login</h1>
          </div>
          <p className="text-muted-foreground mb-8">
            {step === "register" ? "Register with your details and mobile number" : "Enter the OTP sent to your mobile"}
          </p>

          {step === "register" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Enter your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="mobile">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="mobile" placeholder="10-digit mobile number" className="pl-10" maxLength={10} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })} />
                </div>
              </div>
              <div>
                <Label htmlFor="college">College Name</Label>
                <Input id="college" placeholder="Enter your college name" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
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
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button className="w-full bg-gradient-primary border-0 text-primary-foreground hover:opacity-90" size="lg" onClick={handleVerifyOTP}>
                Verify & Login
              </Button>
              <button className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => setStep("register")}>
                ← Change Number
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
