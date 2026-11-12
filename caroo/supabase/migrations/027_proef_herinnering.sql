-- Herinneringsmail aan wie de groep startte: 5 dagen voor het einde van de gratis maand en op de laatste dag.
-- De tijdstempels zorgen dat elke mail maar één keer gaat.
ALTER TABLE public.zorggroepen ADD COLUMN IF NOT EXISTS proef_herinnering_5_op TIMESTAMPTZ;
ALTER TABLE public.zorggroepen ADD COLUMN IF NOT EXISTS proef_herinnering_laatst_op TIMESTAMPTZ;
