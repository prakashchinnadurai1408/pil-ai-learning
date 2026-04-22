import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, ShieldX, LogOut, RefreshCw, GraduationCap } from "lucide-react";
import pluginliveLogo from "@/assets/ai-upskill-hub-logo.png";

type TrainerStatus = "pending" | "approved" | "rejected";

interface Props { children: React.ReactNode }

/**
 * Wraps the trainer dashboard. New trainers (status='pending') see a waiting screen
 * instead of the dashboard until an admin approves them. Rejected trainers are signed out.
 */
const TrainerApprovalGate = ({ children }: Props) => {
  const navigate = useNavigate();
  const trainerId = sessionStorage.getItem("trainerId");
  const [state, setState] = useState<"loading" | "approved" | "pending" | "rejected" | "missing">("loading");
  const [trainer, setTrainer] = useState<{ name: string; email: string; college: string; rejection_reason: string } | null>(null);

  const check = async () => {
    if (!trainerId) { setState("missing"); return; }
    setState("loading");
    const { data, error } = await supabase
      .from("trainers")
      .select("name, email, college, status, rejection_reason")
      .eq("id", trainerId)
      .maybeSingle();
    if (error || !data) { setState("missing"); return; }
    setTrainer({ name: data.name, email: data.email, college: data.college, rejection_reason: (data as any).rejection_reason || "" });
    const status = ((data as any).status as TrainerStatus) || "pending";
    setState(status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending");
  };

  useEffect(() => { check(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [trainerId]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (state === "missing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <ShieldX className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-xl font-display font-bold">Please sign in</h2>
            <p className="text-sm text-muted-foreground">Your trainer session has ended. Please sign in again to continue.</p>
            <Button onClick={() => navigate("/trainer-login")} className="w-full">Go to Trainer Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "approved") return <>{children}</>;

  // Pending or Rejected
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 px-6 h-14 flex items-center justify-between glass">
        <div className="flex items-center gap-3">
          <img src={pluginliveLogo} alt="AI Upskill Hub" className="h-7" />
          <span className="font-display font-bold text-gradient-primary">AI Upskill Hub · Trainer</span>
        </div>
        <Link to="/trainer-login" onClick={() => sessionStorage.clear()}>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center space-y-5">
            {state === "pending" ? (
              <>
                <div className="mx-auto h-14 w-14 rounded-full bg-warning/15 text-warning flex items-center justify-center">
                  <Clock className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-display font-bold">Waiting for approval</h1>
                  <p className="text-sm text-muted-foreground">
                    Hi {trainer?.name || "there"}, thanks for signing up. Your institute coordinator needs to approve your trainer account before you can access the dashboard.
                  </p>
                </div>
                <div className="text-left text-sm bg-muted/40 rounded-lg p-4 space-y-1">
                  <div><span className="text-muted-foreground">Email:</span> <strong>{trainer?.email}</strong></div>
                  <div><span className="text-muted-foreground">College:</span> <strong>{trainer?.college}</strong></div>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={check} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Check again
                  </Button>
                  <Link to="/trainer-login" onClick={() => sessionStorage.clear()}>
                    <Button variant="ghost" className="gap-2"><LogOut className="h-4 w-4" /> Sign out</Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto h-14 w-14 rounded-full bg-destructive/15 text-destructive flex items-center justify-center">
                  <ShieldX className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-display font-bold">Account not approved</h1>
                  <p className="text-sm text-muted-foreground">
                    Your trainer account was not approved. Please contact your institute coordinator for next steps.
                  </p>
                </div>
                {trainer?.rejection_reason && (
                  <div className="text-left text-sm bg-destructive/10 text-destructive rounded-lg p-4">
                    <strong>Reason:</strong> {trainer.rejection_reason}
                  </div>
                )}
                <Link to="/trainer-login" onClick={() => sessionStorage.clear()}>
                  <Button className="w-full gap-2"><LogOut className="h-4 w-4" /> Sign out</Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TrainerApprovalGate;

// Helper used at sign-in time — returns the trainer's status without rendering the gate.
export async function fetchTrainerStatus(trainerId: string): Promise<TrainerStatus> {
  const { data } = await supabase.from("trainers").select("status").eq("id", trainerId).maybeSingle();
  return ((data as any)?.status as TrainerStatus) || "pending";
}

// Re-export an icon so consumers can render quickly without extra imports
export const TrainerGateIcon = GraduationCap;
