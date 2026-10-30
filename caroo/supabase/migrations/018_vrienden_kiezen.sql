-- 018: de hoofdpersoon kiest zelf haar vrienden, de familie regelt het.
-- 1. De hoofdpersoon kan de familie vragen een vriend toe te voegen (vriend_verzoeken).
-- 2. Een koppeling wordt pas actief als beide hoofdpersonen zelf ja zeggen (ja_a, ja_b).

ALTER TABLE public.vriendschappen ADD COLUMN IF NOT EXISTS ja_a BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.vriendschappen ADD COLUMN IF NOT EXISTS ja_b BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.vriendschappen ADD COLUMN IF NOT EXISTS verzoek_id UUID;
-- Bestaande koppelingen tellen als door beiden gekozen
UPDATE public.vriendschappen SET ja_a = TRUE, ja_b = TRUE WHERE status = 'actief';

ALTER TABLE public.vriendschappen DROP CONSTRAINT IF EXISTS vriendschappen_status_check;
ALTER TABLE public.vriendschappen ADD CONSTRAINT vriendschappen_status_check
  CHECK (status IN ('uitgenodigd', 'bevestigen', 'actief'));

-- "Ik wil graag vrienden worden met Henriette": een opdracht aan de familie
CREATE TABLE IF NOT EXISTS public.vriend_verzoeken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id UUID NOT NULL REFERENCES public.zorggroepen(id) ON DELETE CASCADE,
  hoofdpersoon UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vriend_naam TEXT NOT NULL CHECK (char_length(vriend_naam) BETWEEN 1 AND 60),
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  regelt_door UUID REFERENCES public.users(id) ON DELETE SET NULL,
  regelt_naam TEXT,
  regelt_op TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_vriend_verzoeken_groep ON public.vriend_verzoeken(groep_id, aangemaakt_op DESC);

ALTER TABLE public.vriend_verzoeken ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vriend_verzoeken TO service_role;
REVOKE ALL ON public.vriend_verzoeken FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- 3. Handelingsbekwame hoofdpersoon: de beheerder kan instellen dat zij vrienden zelf regelt
ALTER TABLE public.groepsleden ADD COLUMN IF NOT EXISTS vrienden_zelf BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
