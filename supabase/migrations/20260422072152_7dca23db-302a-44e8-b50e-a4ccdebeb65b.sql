ALTER TABLE public.video_lessons REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_lessons;