
-- Tighten destructive access on curriculum submission tables.
-- NOTE: Students and trainers in this app authenticate via sessionStorage (no auth.uid()),
-- so SELECT/INSERT/UPDATE policies remain permissive to keep their flows working.
-- DELETE is the most destructive operation and is restricted to admins (verified via has_role).

-- curriculum_submissions: replace permissive DELETE with admin-only
DROP POLICY IF EXISTS "Anyone can delete curriculum_submissions" ON public.curriculum_submissions;
CREATE POLICY "Only admins can delete curriculum_submissions"
ON public.curriculum_submissions
FOR DELETE
TO public
USING (public.has_role(auth.uid(), 'admin'));

-- curriculum_submission_history: history must be append-only for non-admins.
DROP POLICY IF EXISTS "Anyone can delete submission history" ON public.curriculum_submission_history;
CREATE POLICY "Only admins can delete submission history"
ON public.curriculum_submission_history
FOR DELETE
TO public
USING (public.has_role(auth.uid(), 'admin'));

-- Explicitly forbid UPDATE on history (snapshots are immutable). No UPDATE policy => denied by default,
-- but we add a restrictive admin-only override so admins can correct bad rows if absolutely needed.
CREATE POLICY "Only admins can update submission history"
ON public.curriculum_submission_history
FOR UPDATE
TO public
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
