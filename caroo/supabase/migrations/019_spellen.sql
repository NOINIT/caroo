-- 019: spelletjes tussen vrienden (dobbelen, dammen, schaken). Eén lopend potje per spel per vriendschap.
-- Alleen de server leest en schrijft (service role) en controleert de spelregels.
CREATE TABLE IF NOT EXISTS public.vriend_potjes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vriendschap_id UUID NOT NULL REFERENCES public.vriendschappen(id) ON DELETE CASCADE,
  soort TEXT NOT NULL CHECK (soort IN ('dobbelen', 'dammen', 'schaken')),
  toestand JSONB NOT NULL,
  beurt UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'bezig' CHECK (status IN ('bezig', 'klaar')),
  winnaar UUID REFERENCES public.users(id) ON DELETE SET NULL,
  gelijk BOOLEAN NOT NULL DEFAULT FALSE,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bijgewerkt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vriend_potjes ON public.vriend_potjes(vriendschap_id, soort, aangemaakt_op DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniek_lopend_potje ON public.vriend_potjes(vriendschap_id, soort) WHERE status = 'bezig';

ALTER TABLE public.vriend_potjes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vriend_potjes TO service_role;
REVOKE ALL ON public.vriend_potjes FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
