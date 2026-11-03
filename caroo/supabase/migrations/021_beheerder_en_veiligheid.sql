-- 021: beheren los van de rol, en twee te ruime regels dicht.
--
-- 1. Veiligheid: in de live database stonden twee regels die iedere ingelogde gebruiker
--    toestonden een groep aan te maken en zichzelf aan elke groep toe te voegen (WITH CHECK true).
--    Die gaan weg. Groepen en leden worden voortaan aangemaakt door de server (service role)
--    of door de eigenaar of een beheerder van de groep.
-- 2. Beheren: de hoofdpersoon kan zelf beheerder zijn (kolom beheerder), en elke beheerder kan
--    iemand anders beheerder maken. Familie-beheerders houden rol 'groepsbeheerder'.

DROP POLICY IF EXISTS "groepsleden_aanmaken" ON public.groepsleden;
DROP POLICY IF EXISTS "zorggroepen_aanmaken" ON public.zorggroepen;
CREATE POLICY "zorggroepen_aanmaken" ON public.zorggroepen
  FOR INSERT TO authenticated WITH CHECK (eigenaar_id = auth.uid());

ALTER TABLE public.groepsleden ADD COLUMN IF NOT EXISTS beheerder BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE public.groepsleden SET beheerder = TRUE WHERE rol = 'groepsbeheerder';

CREATE OR REPLACE FUNCTION public.is_beheerder(p_groep_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groepsleden
    WHERE groep_id = p_groep_id AND user_id = p_user_id
      AND (rol = 'groepsbeheerder' OR beheerder)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
REVOKE ALL ON FUNCTION public.is_beheerder(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_beheerder(UUID, UUID) TO authenticated, service_role;

-- Leden toevoegen: alleen de eigenaar of een beheerder van de groep
DROP POLICY IF EXISTS "groepsleden_beheerder_toevoegen" ON public.groepsleden;
CREATE POLICY "groepsleden_beheerder_toevoegen" ON public.groepsleden
  FOR INSERT TO authenticated WITH CHECK (
    public.is_beheerder(groep_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.zorggroepen WHERE id = groep_id AND eigenaar_id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
