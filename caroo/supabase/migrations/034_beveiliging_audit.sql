-- 034: uitkomst van de security-audit (19-11-2026).

-- 1. Gezondheidsgegevens (smileys en medicijnen) alleen met toestemming. Tot nu toe hield alleen de app dit tegen.
CREATE OR REPLACE FUNCTION public.groep_toestemming(p_groep_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT toestemming_gezondheid_op IS NOT NULL FROM zorggroepen WHERE id = p_groep_id;
$$;
REVOKE ALL ON FUNCTION public.groep_toestemming(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.groep_toestemming(UUID) TO authenticated, service_role;

-- 2. Wie iets plaatst, staat er ook als maker bij. Niemand kan een bericht, foto of afspraak op naam van een ander zetten.
DROP POLICY IF EXISTS "dagboek_groepsleden_aanmaken" ON public.dagboek;
CREATE POLICY "dagboek_groepsleden_aanmaken" ON public.dagboek FOR INSERT TO authenticated
  WITH CHECK (is_groepslid(groep_id, auth.uid()) AND auteur_id = auth.uid());

DROP POLICY IF EXISTS "tips_groepsleden_aanmaken" ON public.tips;
CREATE POLICY "tips_groepsleden_aanmaken" ON public.tips FOR INSERT TO authenticated
  WITH CHECK (is_groepslid(groep_id, auth.uid()) AND auteur_id = auth.uid());

DROP POLICY IF EXISTS "fotos_groepsleden_uploaden" ON public.fotos;
CREATE POLICY "fotos_groepsleden_uploaden" ON public.fotos FOR INSERT TO authenticated
  WITH CHECK (is_groepslid(groep_id, auth.uid()) AND uploader_id = auth.uid());

DROP POLICY IF EXISTS "afspraken_groepsleden_aanmaken" ON public.afspraken;
CREATE POLICY "afspraken_groepsleden_aanmaken" ON public.afspraken FOR INSERT TO authenticated
  WITH CHECK (is_groepslid(groep_id, auth.uid()) AND aangemaakt_door = auth.uid());

DROP POLICY IF EXISTS "taken_groepsleden_aanmaken" ON public.taken;
CREATE POLICY "taken_groepsleden_aanmaken" ON public.taken FOR INSERT TO authenticated
  WITH CHECK (is_groepslid(groep_id, auth.uid()) AND aangemaakt_door = auth.uid());

DROP POLICY IF EXISTS "medicijnen_mantelzorger_aanmaken" ON public.medicijnen;
CREATE POLICY "medicijnen_mantelzorger_aanmaken" ON public.medicijnen FOR INSERT TO authenticated
  WITH CHECK (
    is_groepslid(groep_id, auth.uid())
    AND groepsrol(groep_id, auth.uid()) IN ('mantelzorger', 'groepsbeheerder')
    AND aangemaakt_door = auth.uid()
    AND groep_toestemming(groep_id)
  );

DROP POLICY IF EXISTS "registraties_groepsleden_aanmaken" ON public.medicijn_registraties;
CREATE POLICY "registraties_groepsleden_aanmaken" ON public.medicijn_registraties FOR INSERT TO authenticated
  WITH CHECK (is_groepslid(groep_id, auth.uid()) AND geregistreerd_door = auth.uid() AND groep_toestemming(groep_id));

DROP POLICY IF EXISTS "stemming_eigen_invullen" ON public.stemmingen;
CREATE POLICY "stemming_eigen_invullen" ON public.stemmingen FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_groepslid(groep_id, auth.uid()) AND groep_toestemming(groep_id));

DROP POLICY IF EXISTS "stemming_eigen_wijzigen" ON public.stemmingen;
CREATE POLICY "stemming_eigen_wijzigen" ON public.stemmingen FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND groep_toestemming(groep_id));

-- 3. is_beheerder beantwoordt, net als is_groepslid, alleen de vraag over jezelf.
CREATE OR REPLACE FUNCTION public.is_beheerder(p_groep_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT p_user_id = COALESCE(auth.uid(), p_user_id) AND EXISTS (
    SELECT 1 FROM groepsleden
    WHERE groep_id = p_groep_id AND user_id = p_user_id
      AND (rol = 'groepsbeheerder' OR beheerder)
  );
$$;

-- 4. Triggerfuncties: niet van buitenaf aan te roepen, en een vast zoekpad.
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname IN ('handle_new_user', 'trigger_seed_categorieen', 'vul_auteur_naam', 'rls_auto_enable')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname IN ('handle_new_user', 'trigger_seed_categorieen')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', f.sig);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
