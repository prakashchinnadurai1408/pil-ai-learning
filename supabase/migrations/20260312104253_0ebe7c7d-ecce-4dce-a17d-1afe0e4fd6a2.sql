
-- Trainer messages table
CREATE TABLE public.trainer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  recipient_count integer NOT NULL DEFAULT 0
);

-- Per-student notifications
CREATE TABLE public.student_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.trainer_messages(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, message_id)
);

-- RLS
ALTER TABLE public.trainer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read messages" ON public.trainer_messages FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert messages" ON public.trainer_messages FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can read notifications" ON public.student_notifications FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert notifications" ON public.student_notifications FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update notifications" ON public.student_notifications FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_notifications;
