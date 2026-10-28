-- 014: moment waarop het abonnement van een groep is gestopt.
-- Daarna kan de familie nog 30 dagen de verhalen downloaden als boekje.

ALTER TABLE public.zorggroepen
  ADD COLUMN IF NOT EXISTS gestopt_op TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
