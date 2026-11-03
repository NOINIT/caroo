-- 023: uitkomst van de beheren-simulatie (3-11-2026).
-- Groepen aanmaken, leden toevoegen of verwijderen en profielen aanmaken lopen in de app
-- allemaal via de server (service role). De regels waarmee een ingelogde gebruiker dit
-- rechtstreeks in de database kon, zijn dus niet nodig. Een beheerder kon zo iemand anders
-- aan de eigen groep toevoegen zonder uitnodiging, als hij diens id kende. Die gaan weg.

DROP POLICY IF EXISTS "groepsleden_beheerder_toevoegen" ON public.groepsleden;
DROP POLICY IF EXISTS "groepsleden_eigenaar_verwijderen" ON public.groepsleden;
DROP POLICY IF EXISTS "zorggroepen_aanmaken" ON public.zorggroepen;
DROP POLICY IF EXISTS "users_eigen_aanmaken" ON public.users;
DROP POLICY IF EXISTS "Users kunnen eigen rij aanmaken" ON public.users;

NOTIFY pgrst, 'reload schema';
