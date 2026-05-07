
-- Replace permissive policies with deny-by-default; access only via SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS "Anyone can insert video quiz progress" ON public.video_quiz_progress;
DROP POLICY IF EXISTS "Anyone can read video quiz progress" ON public.video_quiz_progress;
DROP POLICY IF EXISTS "Anyone can update video quiz progress" ON public.video_quiz_progress;
DROP POLICY IF EXISTS "Anyone can delete video quiz progress" ON public.video_quiz_progress;

CREATE POLICY "No direct access video quiz progress"
ON public.video_quiz_progress FOR ALL
USING (false) WITH CHECK (false);

-- Validate caller owns the (student_id, mobile) pair
CREATE OR REPLACE FUNCTION public._verify_student(_student_id uuid, _mobile text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = _student_id
      AND mobile = _mobile
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_video_quiz_progress(
  _student_id uuid, _mobile text, _lesson_id uuid
)
RETURNS TABLE(
  answers jsonb, remaining_seconds integer, submitted boolean,
  score integer, last_question_id text, updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._verify_student(_student_id, _mobile) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.answers, p.remaining_seconds, p.submitted,
           p.score, p.last_question_id, p.updated_at
    FROM public.video_quiz_progress p
    WHERE p.student_id = _student_id AND p.lesson_id = _lesson_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_video_quiz_progress(
  _student_id uuid, _mobile text, _lesson_id uuid,
  _answers jsonb, _remaining_seconds integer,
  _submitted boolean, _score integer, _last_question_id text
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _ts timestamptz;
BEGIN
  IF NOT public._verify_student(_student_id, _mobile) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.video_quiz_progress
    (lesson_id, student_id, answers, remaining_seconds, submitted, score, last_question_id)
  VALUES
    (_lesson_id, _student_id, COALESCE(_answers, '{}'::jsonb), _remaining_seconds,
     COALESCE(_submitted, false), COALESCE(_score, 0), _last_question_id)
  ON CONFLICT (lesson_id, student_id) DO UPDATE SET
    answers = EXCLUDED.answers,
    remaining_seconds = EXCLUDED.remaining_seconds,
    submitted = EXCLUDED.submitted,
    score = EXCLUDED.score,
    last_question_id = EXCLUDED.last_question_id,
    updated_at = now()
  RETURNING updated_at INTO _ts;
  RETURN _ts;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_video_quiz_progress(
  _student_id uuid, _mobile text, _lesson_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._verify_student(_student_id, _mobile) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.video_quiz_progress
   WHERE student_id = _student_id AND lesson_id = _lesson_id;
END;
$$;

REVOKE ALL ON FUNCTION public._verify_student(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_video_quiz_progress(uuid, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_video_quiz_progress(uuid, text, uuid, jsonb, integer, boolean, integer, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_video_quiz_progress(uuid, text, uuid) TO anon, authenticated;
