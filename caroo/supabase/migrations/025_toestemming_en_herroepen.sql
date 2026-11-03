-- 025: toestemming voor gezondheidsgegevens vastleggen, en herroepen binnen 14 dagen.
-- Medicijnen en de dagelijkse smiley zijn gezondheidsgegevens (AVG art. 9): we leggen vast
-- wanneer en door wie de toestemming is gegeven. Herroepen: EU-richtlijn 2023/2673.
ALTER TABLE public.zorggroepen
  ADD COLUMN IF NOT EXISTS toestemming_gezondheid_op TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS toestemming_gezondheid_door UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS abonnement_sinds TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS herroepen_op TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
