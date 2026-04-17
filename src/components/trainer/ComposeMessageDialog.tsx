import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Send, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ComposeMessageDialogProps {
  recipientStudents: { id: string; name: string; email: string }[];
}

const ComposeMessageDialog = ({ recipientStudents }: ComposeMessageDialogProps) => {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Please fill in both subject and message");
      return;
    }
    if (recipientStudents.length === 0) {
      toast.error("No students selected to message");
      return;
    }

    setSending(true);
    try {
      // Create the message
      const { data: message, error: msgError } = await supabase
        .from("trainer_messages")
        .insert({ subject: subject.trim(), body: body.trim(), recipient_count: recipientStudents.length })
        .select("id")
        .single();

      if (msgError || !message) throw msgError || new Error("Failed to create message");

      // Create notifications for each student
      const notifications = recipientStudents.map((s) => ({
        student_id: s.id,
        message_id: message.id,
      }));

      const { error: notifError } = await supabase
        .from("student_notifications")
        .insert(notifications);

      if (notifError) throw notifError;

      // Try sending emails via edge function (non-blocking)
      try {
        await supabase.functions.invoke("send-bulk-notification", {
          body: {
            subject: subject.trim(),
            message: body.trim(),
            recipients: recipientStudents.map((s) => ({ email: s.email, name: s.name })),
          },
        });
      } catch {
        // Email sending is best-effort; in-app notification is already saved
        console.warn("Email delivery attempted but may not be configured yet");
      }

      toast.success(`Message sent to ${recipientStudents.length} candidate(s)`);
      setSubject("");
      setBody("");
      setOpen(false);
    } catch (err: any) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-xs">
          <Mail className="h-3 w-3" /> Message Students
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Send Message to Candidates</DialogTitle>
          <DialogDescription>
            This will send an in-app notification{" "}
            {recipientStudents.length > 0 && (
              <>to <span className="font-medium text-foreground">{recipientStudents.length} student(s)</span></>
            )}
            {" "}matching your current filters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="msg-subject">Subject</Label>
            <Input
              id="msg-subject"
              placeholder="e.g. Reminder: Complete Module 5 Assessment"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="msg-body">Message</Label>
            <Textarea
              id="msg-body"
              placeholder="Write your message here..."
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {recipientStudents.length > 0 && recipientStudents.length <= 5 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Recipients:</span>{" "}
              {recipientStudents.map((s) => s.name).join(", ")}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending..." : "Send Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ComposeMessageDialog;
