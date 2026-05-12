
-- Trainer Export Jobs table
CREATE TABLE public.trainer_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  trainer_email text NOT NULL,
  trainer_name text NOT NULL DEFAULT '',
  format text NOT NULL CHECK (format IN ('csv','pdf')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  student_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_total integer NOT NULL DEFAULT 0,
  hard_max integer NOT NULL DEFAULT 20000,
  will_truncate boolean NOT NULL DEFAULT false,
  rows_fetched integer NOT NULL DEFAULT 0,
  pages_fetched integer NOT NULL DEFAULT 0,
  cursor_created_at timestamptz,
  cursor_id uuid,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','canceled','error')),
  cancel_requested boolean NOT NULL DEFAULT false,
  error_message text NOT NULL DEFAULT '',
  file_path text NOT NULL DEFAULT '',
  file_size_bytes bigint NOT NULL DEFAULT 0,
  format_downgraded boolean NOT NULL DEFAULT false,
  job_label text NOT NULL DEFAULT '',
  parent_job_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX trainer_export_jobs_owner_idx ON public.trainer_export_jobs (lower(trainer_email), created_at DESC);
CREATE INDEX trainer_export_jobs_status_idx ON public.trainer_export_jobs (status);

ALTER TABLE public.trainer_export_jobs ENABLE ROW LEVEL SECURITY;

-- RLS: only allow reads via SECURITY DEFINER RPC. Block direct writes.
CREATE POLICY "no direct read" ON public.trainer_export_jobs FOR SELECT USING (false);
CREATE POLICY "no direct write" ON public.trainer_export_jobs FOR ALL USING (false) WITH CHECK (false);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_export_jobs;
ALTER TABLE public.trainer_export_jobs REPLICA IDENTITY FULL;

-- updated_at trigger
CREATE TRIGGER trainer_export_jobs_set_updated
  BEFORE UPDATE ON public.trainer_export_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper RPCs (SECURITY DEFINER, scoped by trainer email, mirroring existing pattern)
CREATE OR REPLACE FUNCTION public.create_trainer_export_job(
  _trainer_id uuid, _email text, _trainer_name text,
  _format text, _filters jsonb, _student_ids jsonb,
  _estimated_total integer, _hard_max integer, _will_truncate boolean,
  _start_cursor_created_at timestamptz, _start_cursor_id uuid,
  _job_label text, _parent_job_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public._verify_trainer(_trainer_id, _email) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.trainer_export_jobs
    (trainer_id, trainer_email, trainer_name, format, filters, student_ids,
     estimated_total, hard_max, will_truncate,
     cursor_created_at, cursor_id, job_label, parent_job_id)
  VALUES
    (_trainer_id, lower(_email), COALESCE(_trainer_name,''), _format,
     COALESCE(_filters,'{}'::jsonb), COALESCE(_student_ids,'[]'::jsonb),
     COALESCE(_estimated_total,0), COALESCE(_hard_max,20000), COALESCE(_will_truncate,false),
     _start_cursor_created_at, _start_cursor_id,
     COALESCE(_job_label,''), _parent_job_id)
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.list_trainer_export_jobs(_trainer_id uuid, _email text, _limit integer DEFAULT 10)
RETURNS SETOF public.trainer_export_jobs
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._verify_trainer(_trainer_id, _email) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.trainer_export_jobs
    WHERE lower(trainer_email) = lower(_email)
    ORDER BY created_at DESC
    LIMIT GREATEST(_limit, 1);
END $$;

CREATE OR REPLACE FUNCTION public.get_trainer_export_job(_trainer_id uuid, _email text, _job_id uuid)
RETURNS public.trainer_export_jobs
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.trainer_export_jobs;
BEGIN
  IF NOT public._verify_trainer(_trainer_id, _email) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO _row FROM public.trainer_export_jobs
    WHERE id = _job_id AND lower(trainer_email) = lower(_email);
  RETURN _row;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_trainer_export_job(_trainer_id uuid, _email text, _job_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._verify_trainer(_trainer_id, _email) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.trainer_export_jobs
     SET cancel_requested = true,
         status = CASE WHEN status IN ('queued','running') THEN status ELSE status END
   WHERE id = _job_id AND lower(trainer_email) = lower(_email);
END $$;

CREATE OR REPLACE FUNCTION public.delete_trainer_export_job(_trainer_id uuid, _email text, _job_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _path text;
BEGIN
  IF NOT public._verify_trainer(_trainer_id, _email) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  SELECT file_path INTO _path FROM public.trainer_export_jobs
    WHERE id = _job_id AND lower(trainer_email) = lower(_email);
  DELETE FROM public.trainer_export_jobs
    WHERE id = _job_id AND lower(trainer_email) = lower(_email);
  RETURN COALESCE(_path,'');
END $$;

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('trainer-exports','trainer-exports', false)
  ON CONFLICT (id) DO NOTHING;

-- No public policies on the bucket; access is mediated by edge functions using the service role.
