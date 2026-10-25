-- Expliciete rechten voor alle Caroo-tabellen.
--
-- Vanaf 30 oktober 2026 geeft Supabase nieuwe tabellen in "public" niet meer
-- automatisch toegang via de Data API (supabase-js). Bestaande tabellen houden
-- hun rechten, maar bij het opnieuw opbouwen van de database (nieuwe omgeving,
-- testomgeving, "supabase db reset") zijn deze GRANTs nodig.
--
-- Bewust GEEN rechten voor "anon" (niet-ingelogde bezoekers): alle gegevens
-- zijn alleen voor ingelogde groepsleden. RLS-policies blijven daarbovenop gelden.
--
-- Regel voor nieuwe tabellen: zet de GRANTs in dezelfde migratie als de CREATE TABLE.
-- Dit bestand kan veilig opnieuw worden uitgevoerd.

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.users,
  public.zorggroepen,
  public.groepsleden,
  public.uitnodigingen,
  public.uitnodiging_log,
  public.taken,
  public.agenda_categorieen,
  public.afspraken,
  public.medicijnen,
  public.medicijn_registraties,
  public.dagboek,
  public.tips,
  public.fotos,
  public.boodschappen,
  public.stemmingen,
  public.bezoekverzoeken
TO authenticated, service_role;

-- Pushabonnementen: alleen de server (service_role), nooit rechtstreeks vanuit de app
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_abonnementen TO service_role;
REVOKE ALL ON public.push_abonnementen FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
