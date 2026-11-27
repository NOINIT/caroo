-- Rollen en rechten per persoon (besluit Farzana 27-11-2026).
-- relatie: hoe iemand bij de hoofdpersoon hoort (familie, vriend/kennis, mantelzorger). Alleen een label.
-- verborgen: onderdelen die deze persoon niet mag zien. Beheerders en de hoofdpersoon zien altijd alles.
ALTER TABLE public.groepsleden ADD COLUMN IF NOT EXISTS relatie TEXT CHECK (relatie IN ('familie', 'vriend', 'mantelzorger'));
ALTER TABLE public.groepsleden ADD COLUMN IF NOT EXISTS verborgen TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.uitnodigingen ADD COLUMN IF NOT EXISTS relatie TEXT CHECK (relatie IN ('familie', 'vriend', 'mantelzorger'));
ALTER TABLE public.uitnodigingen ADD COLUMN IF NOT EXISTS verborgen TEXT[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.mag_zien(p_groep_id UUID, p_onderdeel TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM groepsleden gl
    WHERE gl.groep_id = p_groep_id
      AND gl.user_id = auth.uid()
      AND (gl.beheerder OR gl.rol IN ('oudere', 'groepsbeheerder') OR NOT (p_onderdeel = ANY (gl.verborgen)))
  );
$$;
REVOKE ALL ON FUNCTION public.mag_zien(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mag_zien(UUID, TEXT) TO authenticated, service_role;

-- Leesregels: alleen wat je mag zien
DROP POLICY IF EXISTS medicijnen_groepsleden_lezen ON public.medicijnen;
CREATE POLICY medicijnen_groepsleden_lezen ON public.medicijnen FOR SELECT TO authenticated USING (public.mag_zien(groep_id, 'medicijnen'));
DROP POLICY IF EXISTS registraties_groepsleden_lezen ON public.medicijn_registraties;
CREATE POLICY registraties_groepsleden_lezen ON public.medicijn_registraties FOR SELECT TO authenticated USING (public.mag_zien(groep_id, 'medicijnen'));
DROP POLICY IF EXISTS stemming_lezen ON public.stemmingen;
CREATE POLICY stemming_lezen ON public.stemmingen FOR SELECT TO authenticated USING (public.mag_zien(groep_id, 'stemming'));
DROP POLICY IF EXISTS dagboek_groepsleden_lezen ON public.dagboek;
CREATE POLICY dagboek_groepsleden_lezen ON public.dagboek FOR SELECT TO authenticated USING (public.mag_zien(groep_id, 'dagboek'));
DROP POLICY IF EXISTS afspraken_groepsleden_lezen ON public.afspraken;
CREATE POLICY afspraken_groepsleden_lezen ON public.afspraken FOR SELECT TO authenticated USING (public.mag_zien(groep_id, 'agenda'));
DROP POLICY IF EXISTS taken_groepsleden_lezen ON public.taken;
CREATE POLICY taken_groepsleden_lezen ON public.taken FOR SELECT TO authenticated USING (public.mag_zien(groep_id, 'taken'));
DROP POLICY IF EXISTS fotos_groepsleden_lezen ON public.fotos;
CREATE POLICY fotos_groepsleden_lezen ON public.fotos FOR SELECT TO authenticated USING (public.mag_zien(groep_id, 'fotos'));
DROP POLICY IF EXISTS boodschappen_lezen ON public.boodschappen;
CREATE POLICY boodschappen_lezen ON public.boodschappen FOR SELECT TO authenticated USING (public.mag_zien(groep_id, 'boodschappen'));

NOTIFY pgrst, 'reload schema';
