-- 016: tablet van de hoofdpersoon koppelen met een QR-code, en "Wil je dat iemand belt?"

-- Eenmalige koppelcodes. Alleen de server leest en schrijft (service role).
-- We bewaren alleen een hash van de code; de code zelf staat in de QR-code.
CREATE TABLE IF NOT EXISTS public.koppelcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE,
  groep_id UUID NOT NULL REFERENCES public.zorggroepen(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  aangemaakt_door UUID REFERENCES public.users(id) ON DELETE SET NULL,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verloopt_op TIMESTAMPTZ NOT NULL,
  gebruikt_op TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_koppelcodes_user ON public.koppelcodes(user_id);
ALTER TABLE public.koppelcodes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.koppelcodes TO service_role;
REVOKE ALL ON public.koppelcodes FROM anon, authenticated;

-- Een verzoek is nu bezoek of bellen
ALTER TABLE public.bezoekverzoeken ADD COLUMN IF NOT EXISTS soort TEXT NOT NULL DEFAULT 'bezoek';
DO $$ BEGIN
  ALTER TABLE public.bezoekverzoeken ADD CONSTRAINT bezoekverzoeken_soort_check CHECK (soort IN ('bezoek', 'bellen'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
