import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Check, Mail, X } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  read: boolean;
  created_at: string;
  message: {
    id: string;
    subject: string;
    body: string;
    sent_at: string;
  };
}

interface NotificationsPanelProps {
  studentId: string | null;
}

const NotificationsPanel = ({ studentId }: NotificationsPanelProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!studentId) return;
    const { data } = await supabase
      .from("student_notifications")
      .select("id, read, created_at, message_id")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!data) return;

    // Fetch associated messages
    const messageIds = [...new Set(data.map((n: any) => n.message_id))];
    const { data: messages } = await supabase
      .from("trainer_messages")
      .select("id, subject, body, sent_at")
      .in("id", messageIds);

    const msgMap = new Map((messages || []).map((m: any) => [m.id, m]));

    setNotifications(
      data.map((n: any) => ({
        id: n.id,
        read: n.read,
        created_at: n.created_at,
        message: msgMap.get(n.message_id) || { id: n.message_id, subject: "Message", body: "", sent_at: n.created_at },
      }))
    );
  };

  useEffect(() => {
    fetchNotifications();
  }, [studentId]);

  // Realtime subscription
  useEffect(() => {
    if (!studentId) return;
    const channel = supabase
      .channel("candidate-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "student_notifications", filter: `student_id=eq.${studentId}` },
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [studentId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (notifId: string) => {
    await supabase.from("student_notifications").update({ read: true }).eq("id", notifId);
    setNotifications((prev) => prev.map((n) => n.id === notifId ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    if (!studentId) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("student_notifications").update({ read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}>
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="font-display font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={markAllRead}>
              <Check className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${!n.read ? "bg-primary/5" : ""}`}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.read ? "bg-primary" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">{n.message.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message.body}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsPanel;
