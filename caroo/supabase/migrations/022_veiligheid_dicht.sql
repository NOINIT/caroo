-- 022: uitkomst van de volledige veiligheidscontrole (3-11-2026). Alles wat de app niet nodig heeft, gaat dicht.
-- Wijzigingen aan groepen, gebruikers, uitnodigingen en de teller lopen al via de server (service role).

-- 1. Groepen: een eigenaar kon via de database zelf 'betaald' aanzetten of de proefmaand verlengen.
DROP POLICY IF EXISTS "zorggroepen_eigenaar_bijwerken" ON public.zorggroepen;

-- 2. Gebruikers: eigen profiel wijzigen gaat via de server, niet rechtstreeks.
DROP POLICY IF EXISTS "users_eigen_bijwerken" ON public.users;

-- 3. Uitnodigingen: een mantelzorger kon zelf een uitnodiging als beheerder maken, of de code van
--    een open uitnodiging lezen. Aanmaken gaat via de server; lezen alleen voor beheerders.
DROP POLICY IF EXISTS "uitnodigingen_aanmaken" ON public.uitnodigingen;
DROP POLICY IF EXISTS "uitnodigingen_leden_lezen" ON public.uitnodigingen;
CREATE POLICY "uitnodigingen_beheerder_lezen" ON public.uitnodigingen
  FOR SELECT TO authenticated USING (public.is_beheerder(groep_id, auth.uid()));

-- 4. Teller voor uitnodigingen per dag: kon door de gebruiker zelf op nul gezet worden.
DROP POLICY IF EXISTS "uitnodiging_log_eigen" ON public.uitnodiging_log;

-- 5. Hulpfuncties: niet aanroepbaar van buitenaf, en een vast zoekpad.
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname IN ('seed_standaard_categorieen', 'increment_uitnodiging_teller')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', f.sig);
  END LOOP;
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname IN ('is_groepslid', 'groepsrol', 'groep_betaald')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', f.sig);
  END LOOP;
END $$;

-- 6. Foto's: verwijderen alleen door wie de foto plaatste (de app verwijdert via de server).
DROP POLICY IF EXISTS "Groepsleden mogen eigen fotos verwijderen" ON storage.objects;
CREATE POLICY "Groepsleden mogen eigen fotos verwijderen" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'fotos' AND owner = auth.uid());

-- 7. Niet-ingelogde bezoekers hebben geen enkel recht op de tabellen, ook niet op nieuwe.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

NOTIFY pgrst, 'reload schema';
