-- 017: hoofdpersonen die elkaar kennen koppelen (max 3 per persoon).
-- De koppeling is tussen twee hoofdpersonen, niet tussen families: de groepen blijven gescheiden.
-- Berichten zijn alleen voor de twee hoofdpersonen; de familie leest niet mee.
-- Alleen de server leest en schrijft (service role) en controleert zelf wie wat mag.

CREATE TABLE IF NOT EXISTS public.vriendschappen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persoon_a UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  groep_a UUID NOT NULL REFERENCES public.zorggroepen(id) ON DELETE CASCADE,
  vervoer_a TEXT NOT NULL DEFAULT 'verschilt' CHECK (vervoer_a IN ('zelf', 'nodig', 'verschilt')),
  persoon_b UUID REFERENCES public.users(id) ON DELETE CASCADE,
  groep_b UUID REFERENCES public.zorggroepen(id) ON DELETE CASCADE,
  vervoer_b TEXT CHECK (vervoer_b IN ('zelf', 'nodig', 'verschilt')),
  status TEXT NOT NULL DEFAULT 'uitgenodigd' CHECK (status IN ('uitgenodigd', 'actief')),
  uitnodig_hash TEXT UNIQUE,
  verloopt_op TIMESTAMPTZ,
  aangemaakt_door UUID REFERENCES public.users(id) ON DELETE SET NULL,
  goedgekeurd_door UUID REFERENCES public.users(id) ON DELETE SET NULL,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actief_sinds TIMESTAMPTZ,
  CHECK (persoon_b IS NULL OR persoon_a <> persoon_b)
);
CREATE INDEX IF NOT EXISTS idx_vriendschappen_a ON public.vriendschappen(persoon_a);
CREATE INDEX IF NOT EXISTS idx_vriendschappen_b ON public.vriendschappen(persoon_b);
CREATE INDEX IF NOT EXISTS idx_vriendschappen_groep_a ON public.vriendschappen(groep_a);
CREATE INDEX IF NOT EXISTS idx_vriendschappen_groep_b ON public.vriendschappen(groep_b);

CREATE TABLE IF NOT EXISTS public.vriend_berichten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vriendschap_id UUID NOT NULL REFERENCES public.vriendschappen(id) ON DELETE CASCADE,
  van UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tekst TEXT CHECK (tekst IS NULL OR char_length(tekst) <= 500),
  foto_pad TEXT,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gelezen_op TIMESTAMPTZ,
  CHECK (tekst IS NOT NULL OR foto_pad IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_vriend_berichten ON public.vriend_berichten(vriendschap_id, aangemaakt_op DESC);

-- Woordketting: om de beurt een woord dat begint met de laatste letter van het vorige
CREATE TABLE IF NOT EXISTS public.vriend_spellen (
  vriendschap_id UUID PRIMARY KEY REFERENCES public.vriendschappen(id) ON DELETE CASCADE,
  soort TEXT NOT NULL DEFAULT 'woordketting',
  woorden JSONB NOT NULL DEFAULT '[]'::jsonb,
  beurt UUID REFERENCES public.users(id) ON DELETE SET NULL,
  bijgewerkt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Samen iets doen. 'waar' is 'a' (bij persoon a thuis), 'b' of 'ergens'.
CREATE TABLE IF NOT EXISTS public.vriend_afspraken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vriendschap_id UUID NOT NULL REFERENCES public.vriendschappen(id) ON DELETE CASCADE,
  voorgesteld_door UUID REFERENCES public.users(id) ON DELETE SET NULL,
  wat TEXT NOT NULL CHECK (wat IN ('koffie', 'wandelen', 'boodschappen', 'eigen')),
  eigen_tekst TEXT CHECK (eigen_tekst IS NULL OR char_length(eigen_tekst) <= 80),
  waar TEXT NOT NULL CHECK (waar IN ('a', 'b', 'ergens')),
  dag DATE NOT NULL,
  dagdeel TEXT NOT NULL CHECK (dagdeel IN ('ochtend', 'middag', 'avond')),
  status TEXT NOT NULL DEFAULT 'gevraagd' CHECK (status IN ('gevraagd', 'ja', 'nee')),
  vervoer_a BOOLEAN NOT NULL DEFAULT FALSE,
  vervoer_b BOOLEAN NOT NULL DEFAULT FALSE,
  brengt_a_door UUID REFERENCES public.users(id) ON DELETE SET NULL,
  brengt_a_naam TEXT,
  brengt_b_door UUID REFERENCES public.users(id) ON DELETE SET NULL,
  brengt_b_naam TEXT,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  beantwoord_op TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_vriend_afspraken ON public.vriend_afspraken(vriendschap_id, dag);

ALTER TABLE public.vriendschappen   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vriend_berichten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vriend_spellen   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vriend_afspraken ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vriendschappen   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vriend_berichten TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vriend_spellen   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vriend_afspraken TO service_role;
REVOKE ALL ON public.vriendschappen   FROM anon, authenticated;
REVOKE ALL ON public.vriend_berichten FROM anon, authenticated;
REVOKE ALL ON public.vriend_spellen   FROM anon, authenticated;
REVOKE ALL ON public.vriend_afspraken FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
