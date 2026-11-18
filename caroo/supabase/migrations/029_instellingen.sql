-- Instellingen die we willen kunnen aanpassen zonder de code te veranderen,
-- zoals de lanceringsdatum. Alleen de server (service role) kan hierbij.
CREATE TABLE IF NOT EXISTS public.instellingen (
  naam TEXT PRIMARY KEY,
  waarde TEXT NOT NULL,
  bijgewerkt_op TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.instellingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instellingen FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.instellingen FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.instellingen TO service_role;

-- De lanceringsdatum zetten we pas als die vaststaat, bijvoorbeeld:
-- INSERT INTO public.instellingen (naam, waarde) VALUES ('lancering_op', '2027-01-01T10:00:00+01:00')
--   ON CONFLICT (naam) DO UPDATE SET waarde = EXCLUDED.waarde, bijgewerkt_op = NOW();
