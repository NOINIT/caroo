-- Meerdere familieleden kunnen op één bezoekverzoek reageren, elk met een eigen moment (besluit Farzana 27-11-2026).
-- bezoekverzoeken.reactie_* blijft de eerste reactie (voor oudere schermen en meldingen).
CREATE TABLE IF NOT EXISTS public.bezoek_reacties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verzoek_id UUID NOT NULL REFERENCES public.bezoekverzoeken(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  naam TEXT NOT NULL,
  wanneer TEXT,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (verzoek_id, user_id)
);
CREATE INDEX IF NOT EXISTS bezoek_reacties_verzoek ON public.bezoek_reacties (verzoek_id);

ALTER TABLE public.bezoek_reacties ENABLE ROW LEVEL SECURITY;
-- Lezen: wie lid is van de groep van het verzoek. Schrijven alleen via de server (service_role).
DROP POLICY IF EXISTS bezoek_reacties_lezen ON public.bezoek_reacties;
CREATE POLICY bezoek_reacties_lezen ON public.bezoek_reacties FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bezoekverzoeken b
  WHERE b.id = verzoek_id AND public.is_groepslid(b.groep_id, auth.uid())
));
REVOKE ALL ON public.bezoek_reacties FROM anon, authenticated;
GRANT SELECT ON public.bezoek_reacties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bezoek_reacties TO service_role;

-- Bestaande reacties overnemen
INSERT INTO public.bezoek_reacties (verzoek_id, user_id, naam, wanneer, aangemaakt_op)
SELECT id, reactie_door, COALESCE(reactie_naam, ''), reactie_wanneer, COALESCE(reactie_op, aangemaakt_op)
FROM public.bezoekverzoeken
WHERE reactie_door IS NOT NULL AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = reactie_door)
ON CONFLICT (verzoek_id, user_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
