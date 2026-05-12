
-- 1. Verification helper for trainer-owned operations
CREATE OR REPLACE FUNCTION public._verify_trainer(_trainer_id uuid, _email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trainers
    WHERE id = _trainer_id
      AND lower(email) = lower(_email)
      AND status = 'active'
  )
$$;

-- 2. Pin / unpin / list helpers (SECURITY DEFINER so they bypass the
--    locked-down RLS once trainer identity is verified)
CREATE OR REPLACE FUNCTION public.pin_diff(
  _trainer_id uuid, _email text,
  _history_id uuid, _student_id uuid,
  _curriculum_id uuid, _submission_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public._verify_trainer(_trainer_id, _email) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.trainer_diff_pins
    (trainer_id, history_id, student_id, curriculum_id, submission_id)
  VALUES (_trainer_id, _history_id, _student_id, _curriculum_id, _submission_id)
  ON CONFLICT DO NOTHING
  RETURNING id INTO _id;
  IF _id IS NULL THEN
    SELECT id INTO _id FROM public.trainer_diff_pins
      WHERE trainer_id = _trainer_id AND history_id = _history_id LIMIT 1;
  END IF;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unpin_diff(_trainer_id uuid, _email text, _pin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._verify_trainer(_trainer_id, _email) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.trainer_diff_pins
   WHERE id = _pin_id AND trainer_id = _trainer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_trainer_pins(_trainer_id uuid, _email text)
RETURNS TABLE(id uuid, history_id uuid, student_id uuid, curriculum_id uuid, submission_id uuid, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._verify_trainer(_trainer_id, _email) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, p.history_id, p.student_id, p.curriculum_id, p.submission_id, p.created_at
      FROM public.trainer_diff_pins p
     WHERE p.trainer_id = _trainer_id;
END;
$$;

-- 3. Trainer-authored history helpers
CREATE OR REPLACE FUNCTION public.add_trainer_note(
  _trainer_id uuid, _email text, _trainer_name text,
  _submission_id uuid, _curriculum_id uuid, _student_id uuid,
  _status text, _note text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public._verify_trainer(_trainer_id, _email) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.curriculum_submission_history
    (submission_id, curriculum_id, student_id, kind, status,
     notes, trainer_feedback, actor_id, actor_name, actor_role)
  VALUES (_submission_id, _curriculum_id, _student_id, 'trainer_note',
          COALESCE(_status, ''), _note, _note,
          _trainer_id, _trainer_name, 'trainer')
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_resubmission(
  _trainer_id uuid, _email text, _trainer_name text,
  _submission_id uuid, _curriculum_id uuid, _student_id uuid,
  _message text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public._verify_trainer(_trainer_id, _email) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.curriculum_submissions
     SET status = 'revision_requested',
         reviewed_by = _trainer_id::text,
         reviewed_by_name = _trainer_name,
         reviewed_at = now()
   WHERE id = _submission_id;
  INSERT INTO public.curriculum_submission_history
    (submission_id, curriculum_id, student_id, kind, status,
     revision_message, actor_id, actor_name, actor_role)
  VALUES (_submission_id, _curriculum_id, _student_id, 'revision_requested',
          'revision_requested',
          COALESCE(_message, 'Trainer requested a fresh revision.'),
          _trainer_id, _trainer_name, 'trainer')
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- 4. Lock down trainer_diff_pins: only admins may touch it directly.
--    Trainers go through the SECURITY DEFINER helpers above.
DROP POLICY IF EXISTS "Anyone can read trainer diff pins" ON public.trainer_diff_pins;
DROP POLICY IF EXISTS "Anyone can insert trainer diff pins" ON public.trainer_diff_pins;
DROP POLICY IF EXISTS "Anyone can update trainer diff pins" ON public.trainer_diff_pins;
DROP POLICY IF EXISTS "Anyone can delete trainer diff pins" ON public.trainer_diff_pins;

CREATE POLICY "Admins manage trainer diff pins"
  ON public.trainer_diff_pins
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Block direct trainer-authored history inserts; force them through RPCs.
DROP POLICY IF EXISTS "Anyone can insert submission history" ON public.curriculum_submission_history;

CREATE POLICY "Non-trainer events can be inserted directly"
  ON public.curriculum_submission_history
  FOR INSERT
  WITH CHECK (
    actor_role IS DISTINCT FROM 'trainer'
    OR public.has_role(auth.uid(), 'admin')
  );
