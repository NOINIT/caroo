-- 020: spelletjes tussen de hoofdpersoon en familie of mantelzorgers in dezelfde groep.
-- Een potje hoort nu bij een vriendschap (twee hoofdpersonen) of bij een groep (familielid en hoofdpersoon).
ALTER TABLE public.vriend_potjes ALTER COLUMN vriendschap_id DROP NOT NULL;
ALTER TABLE public.vriend_potjes ADD COLUMN IF NOT EXISTS groep_id UUID REFERENCES public.zorggroepen(id) ON DELETE CASCADE;
-- Bij een groepspotje: speler_a is het familielid, speler_b de hoofdpersoon
ALTER TABLE public.vriend_potjes ADD COLUMN IF NOT EXISTS speler_a UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.vriend_potjes ADD COLUMN IF NOT EXISTS speler_b UUID REFERENCES public.users(id) ON DELETE CASCADE;
DO $$ BEGIN
  ALTER TABLE public.vriend_potjes ADD CONSTRAINT potje_hoort_ergens_bij
    CHECK (vriendschap_id IS NOT NULL OR (groep_id IS NOT NULL AND speler_a IS NOT NULL AND speler_b IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_groep_potjes ON public.vriend_potjes(groep_id, speler_a, speler_b);
CREATE UNIQUE INDEX IF NOT EXISTS uniek_lopend_groepspotje ON public.vriend_potjes(groep_id, speler_a, speler_b, soort)
  WHERE status = 'bezig' AND groep_id IS NOT NULL;
NOTIFY pgrst, 'reload schema';
