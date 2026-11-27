-- Taken: onthouden wie een taak afvinkte en wanneer, zodat hij doorgestreept kan blijven staan.
ALTER TABLE public.taken ADD COLUMN IF NOT EXISTS voltooid_door UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.taken ADD COLUMN IF NOT EXISTS voltooid_op TIMESTAMPTZ;

-- Medicijnen: iedereen in de groep (ook de hoofdpersoon) mag een inname afvinken of terugzetten,
-- ook als iemand anders hem eerder registreerde. Wie het laatst wijzigt, staat erbij.
DROP POLICY IF EXISTS registraties_aanmaker_bijwerken ON public.medicijn_registraties;
DROP POLICY IF EXISTS registraties_groepsleden_bijwerken ON public.medicijn_registraties;
CREATE POLICY registraties_groepsleden_bijwerken ON public.medicijn_registraties FOR UPDATE TO authenticated
USING (public.is_groepslid(groep_id, auth.uid()))
WITH CHECK (public.is_groepslid(groep_id, auth.uid()) AND geregistreerd_door = auth.uid() AND public.groep_toestemming(groep_id));

NOTIFY pgrst, 'reload schema';
